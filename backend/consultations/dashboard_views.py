from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from django.db.models.functions import ExtractWeekDay
from django.db.models import Count, Q

from patients.models import Patient
from rendezvous.models import RendezVous
from consultations.models import Consultation, Ordonnance

class DashboardStatsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        groups = set(user.groups.values_list("name", flat=True))
        
        is_doctor = user.is_superuser or "MEDECIN" in groups
        is_secretary = "SECRETAIRE" in groups
        is_patient = "PATIENT" in groups

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        yesterday_start = today_start - timedelta(days=1)
        yesterday_end = today_start

        def calc_trend(curr, prev):
            if prev == 0:
                return 100 if curr > 0 else 0
            return round(((curr - prev) / prev) * 100)

        data = {}

        if is_doctor:
            # Patients suivis par ce médecin (ayant eu un RDV ou une Consultation)
            total_patients = Patient.objects.filter(
                Q(rendezvous__medecin=user) | Q(consultations__medecin=user)
            ).distinct().count()
            
            total_patients_yesterday = Patient.objects.filter(
                (Q(rendezvous__medecin=user) | Q(consultations__medecin=user)),
                created_at__lt=today_start
            ).distinct().count()
            
            appointments_today = RendezVous.objects.filter(medecin=user, date_heure__gte=today_start, date_heure__lt=today_end).count()
            appointments_yesterday = RendezVous.objects.filter(medecin=user, date_heure__gte=yesterday_start, date_heure__lt=yesterday_end).count()
            
            completed_tasks = Consultation.objects.filter(medecin=user).count()
            completed_tasks_yesterday = Consultation.objects.filter(medecin=user, date__lt=today_start).count()

            data['role'] = 'doctor'
            data['stats'] = {
                'totalPatients': total_patients,
                'appointmentsToday': appointments_today,
                'completedTasks': completed_tasks
            }
            data['trends'] = {
                'totalPatients': calc_trend(total_patients, total_patients_yesterday),
                'appointmentsToday': calc_trend(appointments_today, appointments_yesterday),
                'completedTasks': calc_trend(completed_tasks, completed_tasks_yesterday)
            }
            
            # Graphique : Activité de CE médecin sur les 7 derniers jours
            rdvs_by_day = RendezVous.objects.filter(
                medecin=user,
                date_heure__gte=now - timedelta(days=7)
            ).annotate(weekday=ExtractWeekDay('date_heure')).values('weekday').annotate(count=Count('id'))
            
            day_map = {1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat'}
            chart_data = {d: 0 for d in day_map.values()}
            for r in rdvs_by_day:
                if r['weekday'] in day_map:
                    chart_data[day_map[r['weekday']]] += r['count']
            
            data['chartData'] = [{'name': k, 'patients': v} for k, v in chart_data.items()]

            # Planning personnel du jour (Logique de file d'attente)
            today_rdvs = RendezVous.objects.filter(
                medecin=user,
                date_heure__gte=today_start, 
                date_heure__lt=today_end
            ).exclude(statut='annule').order_by('date_heure')
            
            schedule = []
            for r in today_rdvs:
                end_time = r.date_heure + timedelta(minutes=int(r.duree_minutes or 0))
                if now >= end_time:
                    continue # On enlève si c'est fini
                
                status = 'Waiting'
                if r.date_heure <= now < end_time:
                    status = 'Consulting'
                
                schedule.append({
                    'time': timezone.localtime(r.date_heure).strftime('%H:%M'),
                    'patient': f"{r.patient.prenom} {r.patient.nom}",
                    'reason': r.motif or "Consultation",
                    'status': status
                })
            data['todaySchedule'] = schedule

        elif is_secretary:
            appointments_today = RendezVous.objects.filter(date_heure__gte=today_start, date_heure__lt=today_end).count()
            appointments_yesterday = RendezVous.objects.filter(date_heure__gte=yesterday_start, date_heure__lt=yesterday_end).count()
            
            registrations_today = Patient.objects.filter(created_at__gte=today_start).count()
            registrations_yesterday = Patient.objects.filter(created_at__gte=yesterday_start, created_at__lt=yesterday_end).count()

            data['role'] = 'secretary'
            data['stats'] = {
                'appointmentsToday': appointments_today,
                'newRegistrations': registrations_today,
            }
            data['trends'] = {
                'appointmentsToday': calc_trend(appointments_today, appointments_yesterday),
                'newRegistrations': calc_trend(registrations_today, registrations_yesterday)
            }
            
            # Populate barData with appointments per doctor
            from django.contrib.auth import get_user_model
            User = get_user_model()
            doctors = User.objects.filter(groups__name="MEDECIN")
            bar_data = []
            for doc in doctors:
                count = RendezVous.objects.filter(
                    medecin=doc,
                    date_heure__gte=today_start,
                    date_heure__lt=today_end
                ).count()
                bar_data.append({
                    'name': f"Dr. {doc.last_name}",
                    'appts': count
                })
            data['barData'] = bar_data
            
            # New Queue Logic: Remove finished, show active
            today_rdvs = RendezVous.objects.filter(
                date_heure__gte=today_start, 
                date_heure__lt=today_end
            ).exclude(statut="annule").order_by('date_heure')
            
            queue = []
            for r in today_rdvs:
                end = r.date_heure + timedelta(minutes=int(r.duree_minutes or 0))
                if now >= end:
                    continue # Skip finished
                
                status = 'Waiting'
                if r.date_heure <= now < end:
                    status = 'Consulting'
                
                queue.append({
                    'name': f"{r.patient.prenom} {r.patient.nom}",
                    'time': timezone.localtime(r.date_heure).strftime('%H:%M'),
                    'status': status,
                    'doctor': f"Dr. {r.medecin.last_name}" if r.medecin else ""
                })
            data['checkInQueue'] = queue

        elif is_patient:
            data['role'] = 'patient'
            next_rdv = RendezVous.objects.filter(
                patient__user=user, 
                date_heure__gte=now
            ).exclude(statut='annule').order_by('date_heure').first()
            if next_rdv:
                data['nextVisit'] = {
                    'day': 'Today' if next_rdv.date_heure.date() == now.date() else next_rdv.date_heure.strftime('%b %d'),
                    'time': timezone.localtime(next_rdv.date_heure).strftime('%H:%M %p'),
                    'doctor': f"Dr. {next_rdv.medecin.last_name}" if next_rdv.medecin else "Dr. Yahyaoui"
                }
            else:
                data['nextVisit'] = None
                
            past_consultations = Consultation.objects.filter(patient__user=user).order_by('-date')[:3]
            data['healthJourney'] = [
                {
                    'title': "Consultation",
                    'date': timezone.localtime(c.date).strftime('%B %d, %Y'),
                    'desc': c.diagnostic or c.notes_cliniques or "Regular checkup."
                } for c in past_consultations
            ]
            
            active_prescriptions = []
            for c in past_consultations:
                if hasattr(c, 'ordonnance'):
                    for ligne in c.ordonnance.lignes.all():
                        active_prescriptions.append({
                            'med': ligne.nom,
                            'dose': ligne.dosage,
                            'duration': f"{ligne.duree_jours} jours" if ligne.duree_jours else "N/A"
                        })
            data['activePrescriptions'] = active_prescriptions

        else:
            data['role'] = 'unknown'
            data['stats'] = {}

        return Response(data)
