const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export const formatMoney = (value: number) => money.format(value);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

export const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};

// Acepta "1.500,50" o "1500.5" y devuelve un número, o null si no es válido.
export const parseAmount = (text: string): number | null => {
  const clean = text.trim().replace(/\s/g, '');
  if (!clean) return null;
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// wa.me necesita el número con código de país. Si viene un celular argentino
// sin código (10 dígitos, ej. 1122334455), le agregamos el 549.
export const whatsappNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '').replace(/^0/, '');
  return digits.length === 10 ? `549${digits}` : digits;
};

export const whatsappLink = (phone: string, text: string) =>
  `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(text)}`;
