import { Entity, Column, OneToMany } from 'typeorm';
import { Document } from 'src/modules/document/schemas/document.schema';
import { BaseEntity } from 'src/base/base.schema';

@Entity('document_fields')
export class DocumentField extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  acronym: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => Document, (document) => document.documentField)
  documents: Document[];
}
