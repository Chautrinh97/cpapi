import { BaseEntity } from 'src/base/base.schema';
import { DocumentField } from 'src/modules/document-field/schemas/document-field.schema';
import { DocumentType } from 'src/modules/document-type/schemas/document-type.schema';
import { IssuingBody } from 'src/modules/issuing-body/schemas/issuing-body.schema';
import { User } from 'src/modules/user/schemas/user.schema';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Relation,
} from 'typeorm';

@Entity('documents')
export class Document extends BaseEntity {
  @Column({ length: 1000 })
  title: string;

  @Column({ length: 30, nullable: true, name: 'reference_number' })
  referenceNumber: string;

  @Column({ nullable: true, name: 'issuance_date' })
  issuanceDate: Date;

  @Column({ nullable: true, name: 'effective_date' })
  effectiveDate: Date;

  @Column({ default: true, name: 'validity_status' })
  validityStatus: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ unsigned: true, name: 'document_size' })
  documentSize: number;

  @Column({ type: 'text', name: 'storage_path' })
  storagePath: string;

  @Column({ type: 'text', name: 'key' })
  key: string;

  @Column({ length: 100, name: 'mime_type' })
  mimeType: string;

  @Column({ default: true, name: 'is_public' })
  @Index()
  isPublic: boolean;

  @Column({ default: false, name: 'is_regulatory' })
  @Index()
  isRegulatory: boolean;

  @ManyToOne(() => DocumentField, (documentField) => documentField.documents, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'document_field_id' })
  documentField: Relation<DocumentField>;

  @ManyToOne(() => DocumentType, (documentType) => documentType.documents, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'document_type_id' })
  documentType: Relation<DocumentType>;

  @ManyToOne(() => IssuingBody, (issuingBody) => issuingBody.documents, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'issuing_body_id' })
  issuingBody: Relation<IssuingBody>;

  @ManyToOne(() => User, (user) => user.documents, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'created_by' })
  createdBy: Relation<User>;
}
