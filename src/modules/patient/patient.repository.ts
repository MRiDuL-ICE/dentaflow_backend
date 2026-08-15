import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from '@common/repository/base.repository';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import {
  CreatePatientDto,
  EmergencyContactDto,
  InsuranceDto,
  CustomFieldDto,
} from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientRecord } from './types/patient.types';
import { READ_POOL, WRITE_POOL } from '@database/database.module';

@Injectable()
export class PatientRepository extends BaseRepository {
  constructor(
    cls: ClsService<TenantClsStore>,
    @Inject(WRITE_POOL) writePool: Pool,
    @Inject(READ_POOL) readPool: Pool,
  ) {
    super(cls, writePool, readPool);
  }

  async create(
    dto: CreatePatientDto,
    createdBy: string,
    client?: PoolClient,
  ): Promise<PatientRecord> {
    const sql = `INSERT INTO patients
       (first_name, last_name, date_of_birth, gender,
        phone, email, address, medical_history, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`;
    const params = [
      dto.firstName,
      dto.lastName,
      dto.dateOfBirth ?? null,
      dto.gender ?? null,
      dto.phone ?? null,
      dto.email ?? null,
      JSON.stringify(dto.address ?? {}),
      JSON.stringify(dto.medicalHistory ?? {}),
      createdBy,
    ];

    const rows = client
      ? (await client.query(sql, params)).rows
      : await this.execute<any>(sql, params);

    return this.map(rows[0]);
  }
  async findById(id: string): Promise<PatientRecord | null> {
    const rows = await this.query<{
      id: string;
      first_name: string;
      last_name: string;
      date_of_birth: string | null;
      gender: string | null;
      phone: string | null;
      email: string | null;
      address: Record<string, unknown>;
      medical_history: Record<string, unknown>;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT first_name, last_name, date_of_birth, gender, phone, email, address, medical_history FROM patients
       WHERE id = $1 AND is_deleted = false`,
      [id],
    );
    return rows[0] ? this.map(rows[0]) : null;
  }

  async findAll(params: {
    search?: string;
    limit: number;
    offset: number;
  }): Promise<{ patients: PatientRecord[]; total: number }> {
    const conditions: string[] = ['is_deleted = false'];
    const values: unknown[] = [];
    let idx = 1;

    if (params.search) {
      conditions.push(`(
        first_name ILIKE $${idx} OR
        last_name  ILIKE $${idx} OR
        email      ILIKE $${idx} OR
        phone      ILIKE $${idx}
      )`);
      values.push(`%${params.search}%`);
      idx++;
    }

    const where = conditions.join(' AND ');

    const [dataRows, countRows] = await Promise.all([
      this.query<{
        id: string;
        first_name: string;
        last_name: string;
        date_of_birth: string | null;
        gender: string | null;
        phone: string | null;
        email: string | null;
        address: Record<string, unknown>;
        medical_history: Record<string, unknown>;
        created_at: Date;
        updated_at: Date;
      }>(
        `SELECT id, first_name, last_name, date_of_birth, gender, phone, email, address, medical_history FROM patients
         WHERE ${where}
         ORDER BY last_name, first_name
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, params.limit, params.offset],
      ),
      this.query<{ count: string }>(`SELECT COUNT(*) FROM patients WHERE ${where}`, values),
    ]);

    //console.log('dataRows', dataRows);

    return {
      patients: dataRows.map((r) => this.map(r)),
      total: parseInt(countRows[0].count, 10),
    };
  }

  async existsByEmail(email: string): Promise<boolean> {
    const rows = await this.query<{ exists: boolean }>(
      `SELECT EXISTS (
       SELECT 1 FROM patients WHERE email = $1 AND is_deleted = false
     ) AS exists`,
      [email],
    );
    return rows[0].exists;
  }

  async update(
    id: string,
    dto: UpdatePatientDto,
    client?: PoolClient,
  ): Promise<PatientRecord | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.firstName !== undefined) {
      sets.push(`first_name = $${idx++}`);
      values.push(dto.firstName);
    }
    if (dto.lastName !== undefined) {
      sets.push(`last_name = $${idx++}`);
      values.push(dto.lastName);
    }
    if (dto.dateOfBirth !== undefined) {
      sets.push(`date_of_birth = $${idx++}`);
      values.push(dto.dateOfBirth);
    }
    if (dto.gender !== undefined) {
      sets.push(`gender = $${idx++}`);
      values.push(dto.gender);
    }
    if (dto.phone !== undefined) {
      sets.push(`phone = $${idx++}`);
      values.push(dto.phone);
    }
    if (dto.email !== undefined) {
      sets.push(`email = $${idx++}`);
      values.push(dto.email);
    }
    if (dto.address !== undefined) {
      sets.push(`address = $${idx++}`);
      values.push(JSON.stringify(dto.address));
    }
    if (dto.medicalHistory !== undefined) {
      sets.push(`medical_history = $${idx++}`);
      values.push(JSON.stringify(dto.medicalHistory));
    }

    if (!sets.length) return this.findById(id);

    sets.push(`updated_at = now()`);
    values.push(id);

    const sql = `UPDATE patients SET ${sets.join(', ')}
               WHERE id = $${idx} AND is_deleted = false
               RETURNING *`;

    const rows = client
      ? (await client.query(sql, values)).rows
      : await this.execute<any>(sql, values);

    return rows[0] ? this.map(rows[0]) : null;
  }

  async softDelete(id: string, deletedBy: string): Promise<boolean> {
    const rows = await this.execute<{ id: string }>(
      `UPDATE patients
       SET is_deleted = true, deleted_at = now(), deleted_by = $1,
           updated_at = now()
       WHERE id = $2 AND is_deleted = false
       RETURNING id`,
      [deletedBy, id],
    );
    return rows.length > 0;
  }

  // ── Relations ─────────────────────────────────────────

  async upsertInsurance(patientId: string, dto: InsuranceDto, client?: PoolClient): Promise<void> {
    const sql = `
      INSERT INTO patient_insurance
        (patient_id, provider, policy_number, group_number,
         coverage_details, valid_from, valid_until)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (patient_id)
      DO UPDATE SET
        provider         = EXCLUDED.provider,
        policy_number    = EXCLUDED.policy_number,
        group_number     = EXCLUDED.group_number,
        coverage_details = EXCLUDED.coverage_details,
        valid_from       = EXCLUDED.valid_from,
        valid_until      = EXCLUDED.valid_until,
        updated_at       = now()
    `;
    const params = [
      patientId,
      dto.provider,
      dto.policyNumber,
      dto.groupNumber ?? null,
      JSON.stringify(dto.coverageDetails ?? {}),
      dto.validFrom ?? null,
      dto.validUntil ?? null,
    ];

    if (client) {
      await client.query(sql, params);
    } else {
      await this.execute(sql, params);
    }
  }

  async replaceEmergencyContacts(
    patientId: string,
    contacts: EmergencyContactDto[],
    client: PoolClient,
  ): Promise<void> {
    await client.query(`DELETE FROM patient_emergency_contacts WHERE patient_id = $1`, [patientId]);
    for (const c of contacts) {
      await client.query(
        `INSERT INTO patient_emergency_contacts
           (patient_id, name, relationship, phone, email)
         VALUES ($1,$2,$3,$4,$5)`,
        [patientId, c.name, c.relationship, c.phone, c.email ?? null],
      );
    }
  }

  async replaceCustomFields(
    patientId: string,
    fields: CustomFieldDto[],
    client: PoolClient,
  ): Promise<void> {
    await client.query(`DELETE FROM patient_custom_fields WHERE patient_id = $1`, [patientId]);
    for (const f of fields) {
      await client.query(
        `INSERT INTO patient_custom_fields (patient_id, field_key, field_value)
         VALUES ($1,$2,$3)`,
        [patientId, f.key, f.value],
      );
    }
  }

  async get360(patientId: string): Promise<Record<string, unknown>> {
    const [patient, insurance, contacts, customFields] = await Promise.all([
      this.query<Record<string, unknown>>(
        `SELECT id, first_name, last_name, date_of_birth, gender, phone, email, address, medical_history, created_by, created_at, updated_at, deleted_at, deleted_by FROM patients WHERE id = $1 AND is_deleted = false`,
        [patientId],
      ),
      this.query<Record<string, unknown>>(`SELECT * FROM patient_insurance WHERE patient_id = $1`, [
        patientId,
      ]),
      this.query<Record<string, unknown>>(
        `SELECT id, name, relationship, phone, email, created_at FROM patient_emergency_contacts WHERE patient_id = $1`,
        [patientId],
      ),
      this.query<Record<string, unknown>>(
        `SELECT field_key, field_value FROM patient_custom_fields
         WHERE patient_id = $1`,
        [patientId],
      ),
    ]);

    return {
      ...patient[0],
      insurance: insurance[0] ?? null,
      emergencyContacts: contacts,
      customFields,
    };
  }

  async findByEmail(email: string): Promise<Partial<PatientRecord> | null> {
    const { rows: schemaRows } = await this.readPool.query<{ schema_name: string }>(
      `SELECT schema_name FROM public.clinics
     WHERE is_active = true AND slug != 'platform'`,
      [],
    );

    for (const { schema_name } of schemaRows) {
      try {
        const { rows } = await this.readPool.query<any>(
          `SELECT id, first_name, last_name, phone, date_of_birth, gender
         FROM "${schema_name}".patients
         WHERE email = $1 AND is_deleted = false
         LIMIT 1`,
          [email],
        );
        if (rows[0]) {
          return {
            id: rows[0].id,
            firstName: rows[0].first_name,
            lastName: rows[0].last_name,
            phone: rows[0].phone,
            dateOfBirth: rows[0].date_of_birth,
            gender: rows[0].gender,
          };
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  async linkClinicMember(patientId: string, clinicMemberId: string): Promise<void> {
    await this.execute(
      `UPDATE patients
     SET clinic_member_id = $1, updated_at = now()
     WHERE id = $2`,
      [clinicMemberId, patientId],
    );
  }

  async getClinicMemberId(patientId: string): Promise<string | null> {
    const rows = await this.query<{ clinic_member_id: string | null }>(
      `SELECT clinic_member_id FROM patients WHERE id = $1`,
      [patientId],
    );
    return rows[0]?.clinic_member_id ?? null;
  }

  async createWithRelations(dto: CreatePatientDto, createdBy: string): Promise<PatientRecord> {
    return this.transaction(async (client) => {
      const p = await this.create(dto, createdBy, client);
      if (dto.insurance) await this.upsertInsurance(p.id, dto.insurance, client);
      if (dto.emergencyContacts?.length)
        await this.replaceEmergencyContacts(p.id, dto.emergencyContacts, client);
      if (dto.customFields?.length) await this.replaceCustomFields(p.id, dto.customFields, client);
      return p;
    });
  }

  async updateWithRelations(id: string, dto: UpdatePatientDto): Promise<PatientRecord | null> {
    return this.transaction(async (client) => {
      const p = await this.update(id, dto, client);
      if (dto.insurance) await this.upsertInsurance(id, dto.insurance, client);
      if (dto.emergencyContacts)
        await this.replaceEmergencyContacts(id, dto.emergencyContacts, client);
      if (dto.customFields) await this.replaceCustomFields(id, dto.customFields, client);
      return p;
    });
  }

  private map(r: {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string | null;
    gender: string | null;
    phone: string | null;
    email: string | null;
    address: Record<string, unknown>;
    medical_history: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
  }): PatientRecord {
    return {
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      dateOfBirth: r.date_of_birth,
      gender: r.gender,
      phone: r.phone,
      email: r.email,
      address: r.address,
      medicalHistory: r.medical_history,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
