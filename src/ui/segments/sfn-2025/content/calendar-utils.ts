type AgendaItem = {
  title: string;
  subtitle: string;
  time: string;
  agendaText?: string;
};

export function generateICalendar(item: AgendaItem): void {
  const [startTime, endTime] = item.time.split(' – ');
  const startDate = new Date(`2024-11-02 ${startTime}:00`);
  const endDate = new Date(`2024-11-02 ${endTime}:00`);

  const dtStamp = `${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
  const dtStart = `${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
  const dtEnd = `${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;

  const summary = `${item.title} - Open Brain Institute @ SFN 2025`;
  const description =
    item.agendaText || `${item.subtitle} at SFN 2025. Open Brain Platform booth #3631.`;
  const location = 'San Diego Convention Center, booth #3631';

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Open Brain Platform//SFN 2025//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${item.title.toLowerCase().replace(/\s+/g, '-')}-sfn2025@openbrainplatform.org
DTSTAMP:${dtStamp}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${summary}
DESCRIPTION:${description}
LOCATION:${location}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // Try to open with calendar app using webcal protocol
  const link = document.createElement('a');
  link.href = url;
  link.download = `${item.title.toLowerCase().replace(/\s+/g, '-')}-sfn2025.ics`;

  // Add to body temporarily for click
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

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${item.title} - Open Brain Institute @ SFN 2025`)}&dates=${startISO.replace(/[-:]/g, '').split('.')[0]}Z/${endISO.replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(item.agendaText || `${item.subtitle} at SFN 2025. Open Brain Platform booth #3631.`)}&location=${encodeURIComponent('San Diego Convention Center, booth #3631')}`;

  window.open(googleUrl, '_blank');
}
