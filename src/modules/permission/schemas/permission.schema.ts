import { BaseEntity } from 'src/base/base.schema';
import { Column, Entity, ManyToMany } from 'typeorm';
import { AuthorityGroup } from './authority-group.schema';
@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToMany(
    () => AuthorityGroup,
    (authorityGroup) => authorityGroup.permissions,
  )
  authorityGroups: AuthorityGroup[];
}
