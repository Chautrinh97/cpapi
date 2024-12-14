import { BaseEntity } from 'src/base/base.schema';
import { Column, Entity, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { Permission } from './permission.schema';
import { User } from 'src/modules/user/schemas/user.schema';
@Entity('authority_group')
export class AuthorityGroup extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToMany(() => Permission, (permission) => permission.authorityGroups)
  @JoinTable({
    name: 'authority_group_permissions',
    joinColumn: {
      name: 'authority_group_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'permission_id',
      referencedColumnName: 'id',
    },
  })
  permissions: Permission[];

  @OneToMany(() => User, (user) => user.authorityGroup)
  users: User[];
}
