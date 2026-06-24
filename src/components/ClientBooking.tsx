/**

* Arquivo ponte da página pública de agendamento - AgendaZap.
*
* O fluxo principal de agendamento foi refatorado para:
* src/features/booking/ClientBooking.tsx
*
* Mantemos este arquivo para não quebrar imports existentes,
* especialmente no App.tsx.
  */

export { default } from '../features/booking/ClientBooking';
