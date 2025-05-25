export interface FutureAppointmentProvider {
  id: string;
  clientName: string;
  clientImage: string | null;
  date: string;
  time: string;
  serviceName: string;
  status: string;
}
