import { Globe } from "lucide-react";

const TIMEZONES = [
  { value: "America/Sao_Paulo", label: "Brasília (UTC-3)" },
  { value: "America/New_York", label: "Nova York (UTC-5)" },
  { value: "America/Chicago", label: "Chicago (UTC-6)" },
  { value: "America/Denver", label: "Denver (UTC-7)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC-8)" },
  { value: "America/Manaus", label: "Manaus (UTC-4)" },
  { value: "America/Noronha", label: "Fernando de Noronha (UTC-2)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (UTC-3)" },
  { value: "Europe/London", label: "Londres (UTC+0)" },
  { value: "Europe/Paris", label: "Paris (UTC+1)" },
  { value: "Europe/Berlin", label: "Berlim (UTC+1)" },
  { value: "Europe/Moscow", label: "Moscou (UTC+3)" },
  { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
  { value: "Asia/Kolkata", label: "Índia (UTC+5:30)" },
  { value: "Asia/Shanghai", label: "Xangai (UTC+8)" },
  { value: "Asia/Tokyo", label: "Tóquio (UTC+9)" },
  { value: "Australia/Sydney", label: "Sydney (UTC+11)" },
  { value: "Pacific/Auckland", label: "Auckland (UTC+12)" },
  { value: "Etc/UTC", label: "UTC+0" },
];

interface Props {
  value: string;
  onChange: (tz: string) => void;
}

export function TimezoneSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-secondary rounded-lg px-2 py-1.5 text-xs outline-none border border-border text-foreground"
      >
        {TIMEZONES.map(tz => (
          <option key={tz.value} value={tz.value}>{tz.label}</option>
        ))}
      </select>
    </div>
  );
}
