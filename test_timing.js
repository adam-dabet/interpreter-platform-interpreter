const appointmentDate = '2025-09-11';
const appointmentTime = '11:33:00';
const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
const now = new Date();
const timeDiff = appointmentDateTime.getTime() - now.getTime();
const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);

console.log('Hours until appointment:', hoursUntilAppointment.toFixed(2));
console.log('Should have 1-day reminder (2-24 hours):', hoursUntilAppointment <= 24 && hoursUntilAppointment > 2);
console.log('Should have 2-hour reminder (5min-2 hours):', hoursUntilAppointment <= 2 && hoursUntilAppointment > (5/60));
console.log('Should have 5-minute reminder (0-5min):', hoursUntilAppointment <= (5/60) && hoursUntilAppointment > 0);

const shouldHave1DayReminder = hoursUntilAppointment <= 24 && hoursUntilAppointment > 2;
const shouldHave2HourReminder = hoursUntilAppointment <= 2 && hoursUntilAppointment > (5/60);
const shouldHave5MinuteReminder = hoursUntilAppointment <= (5/60) && hoursUntilAppointment > 0;

console.log('All reminders sent?', !shouldHave2HourReminder && !shouldHave5MinuteReminder);
