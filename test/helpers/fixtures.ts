import { faker } from '@faker-js/faker';
import { Gender } from '@modules/patient/dto/create-patient.dto';

export const createPatientFixture = () => ({
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  dateOfBirth: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }).toISOString().split('T')[0],
  gender: faker.helpers.arrayElement([Gender.MALE, Gender.FEMALE, Gender.OTHER]),
  phone: faker.phone.number(),
  email: faker.internet.email(),
  address: {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    country: faker.location.country(),
  },
  medicalHistory: {
    allergies: [faker.lorem.word()],
    conditions: [],
    medications: [],
    notes: faker.lorem.sentence(),
  },
});

export const createAppointmentFixture = (patientId: string, dentistId: string) => ({
  patientId,
  dentistId,
  treatmentType: faker.helpers.arrayElement(['Cleaning', 'Filling', 'Extraction', 'Checkup']),
  durationMinutes: faker.helpers.arrayElement([30, 45, 60]),
  scheduledAt: faker.date.future().toISOString(),
  notes: faker.lorem.sentence(),
});

export const createInvoiceFixture = (patientId: string) => ({
  patientId,
  discount: 0,
  tax: 5,
  items: [
    {
      description: faker.commerce.productName(),
      quantity: 1,
      unitCost: parseFloat(faker.commerce.price({ min: 50, max: 500 })),
    },
  ],
});

export const createUserFixture = () => ({
  email: faker.internet.email(),
  password: 'TestPass123!',
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
});
