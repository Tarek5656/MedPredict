from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from django.db.models.functions import ExtractWeekDay
from django.db.models import Count

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
            total_patients = Patient.objects.count()
            total_patients_yesterday = Patient.objects.filter(created_at__lt=today_start).count()
            
            appointments_today = RendezVous.objects.filter(date_heure__gte=today_start, date_heure__lt=today_end).count()
            appointments_yesterday = RendezVous.objects.filter(date_heure__gte=yesterday_start, date_heure__lt=yesterday_end).count()
            
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
            
            # Chart Data (Mocking weekday aggregation for now since RendezVous doesn't have a medecin)
            # Or we can aggregate Rendezvous by weekday for the clinic
            rdvs_by_day = RendezVous.objects.filter(date_heure__gte=now - timedelta(days=7)).annotate(weekday=ExtractWeekDay('date_heure')).values('weekday').annotate(count=Count('id'))
            
            day_map = {1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat'}
            chart_data = {d: 0 for d in day_map.values()}
            for r in rdvs_by_day:
                if r['weekday'] in day_map:
                    chart_data[day_map[r['weekday']]] += r['count']
            
            data['chartData'] = [{'name': k, 'patients': v} for k, v in chart_data.items()]
            
            today_rdvs = RendezVous.objects.filter(date_heure__gte=today_start, date_heure__lt=today_end).exclude(statut='annule').order_by('date_heure')
            data['todaySchedule'] = [
                {
                    'time': timezone.localtime(r.date_heure).strftime('%H:%M %p'),
                    'patient': f"{r.patient.prenom} {r.patient.nom}",
                    'reason': r.motif or "Consultation"
                } for r in today_rdvs
            ]

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
            
            # Since Rendezvous doesn't have medecin, we just send empty barData or a generic stat
            data['barData'] = []
            
            pending_rdvs = RendezVous.objects.filter(date_heure__gte=today_start, date_heure__lt=today_end, statut="planifie").order_by('date_heure')
            data['checkInQueue'] = [
                {
                    'name': f"{r.patient.prenom} {r.patient.nom}",
                    'time': timezone.localtime(r.date_heure).strftime('%H:%M %p'),
                    'status': 'Waiting'
                } for r in pending_rdvs
            ]

        elif is_patient:
            data['role'] = 'patient'
            next_rdv = RendezVous.objects.filter(patient__user=user, date_heure__gte=now).order_by('date_heure').first()
            if next_rdv:
                data['nextVisit'] = {
                    'day': 'Today' if next_rdv.date_heure.date() == now.date() else next_rdv.date_heure.strftime('%b %d'),
                    'time': timezone.localtime(next_rdv.date_heure).strftime('%H:%M %p'),
                    'doctor': "Clinic Doctor"
                }
            else:
                data['nextVisit'] = None
                
            past_consultations = Consultation.objects.filter(patient__user=user).order_by('-date')[:3]
            data['healthJourney'] = [
                {
                    'title': "Consultation",
                    'date': timezone.localtime(c.date).strftime('%B %d, %Y'),
                    'desc': c.observations or "Regular checkup."
                } for c in past_consultations
            ]
            
            active_prescriptions = []
            for c in past_consultations:
                if hasattr(c, 'ordonnance'):
                    for ligne in c.ordonnance.lignes.all():
                        active_prescriptions.append({
                            'med': ligne.medicament,
                            'dose': ligne.posologie,
                            'duration': ligne.duree
                        })
            data['activePrescriptions'] = active_prescriptions

        else:
            data['role'] = 'unknown'
            data['stats'] = {}

        return Response(data)
