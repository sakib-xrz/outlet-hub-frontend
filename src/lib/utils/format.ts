const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export const formatDateTime = (value: string): string => dateTimeFormat.format(new Date(value));
export const formatDate = (value: string): string => dateFormat.format(new Date(value));
