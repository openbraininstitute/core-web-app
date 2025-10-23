type AgendaItem = {
  title: string;
  subtitle: string;
  time: string;
};

export function generateICalendar(item: AgendaItem): void {
  const [startTime, endTime] = item.time.split(' – ');
  const startDate = new Date(`2024-11-02 ${startTime}:00`);
  const endDate = new Date(`2024-11-02 ${endTime}:00`);

  const icsContent = `  BEGIN:VCALENDAR
                        VERSION:2.0
                        PRODID:-//Open Brain Platform//SFN 2025//EN
                        BEGIN:VEVENT
                        UID:${item.title.toLowerCase().replace(/\s+/g, '-')}-sfn2025@openbrainplatform.org
                        DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
                        DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
                        DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
                        SUMMARY:${item.title} - ${item.subtitle}
                        DESCRIPTION:${item.subtitle} at SFN 2025. Open Brain Platform booth #3631.
                        LOCATION:San Diego Convention Center, booth #3631
                        END:VEVENT
                        END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${item.title.toLowerCase().replace(/\s+/g, '-')}-sfn2025.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateGoogleCalendar(item: AgendaItem): void {
  const [startTime, endTime] = item.time.split(' – ');
  const startDate = new Date(`2024-11-02 ${startTime}:00`);
  const endDate = new Date(`2024-11-02 ${endTime}:00`);

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(item.title + ' - ' + item.subtitle)}&dates=${startISO.replace(/[-:]/g, '').split('.')[0]}Z/${endISO.replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(item.subtitle + ' at SFN 2025. Open Brain Platform booth #3631.')}&location=${encodeURIComponent('San Diego Convention Center, booth #3631')}`;

  window.open(googleUrl, '_blank');
}
