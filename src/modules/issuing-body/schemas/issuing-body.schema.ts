import { BaseEntity } from 'src/base/base.schema';
import { Document } from 'src/modules/document/schemas/document.schema';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity('issuing_bodies')
export class IssuingBody extends BaseEntity {
  @Column({ length: 1000 })
  name: string;

  @Column({ length: 255 })
  acronym: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => Document, (document) => document.issuingBody)
  documents: Document[];
}
