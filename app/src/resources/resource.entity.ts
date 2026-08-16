import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
@Entity('resources')
export class Resource { @PrimaryGeneratedColumn() id:number; @Column() ownerId:number; @Column() title:string; @Column({type:'text'}) content:string; @Column({default:'NOTE'}) type:string; @Column({type:'simple-json',nullable:true}) tags:string[]|null; @CreateDateColumn() createdAt:Date; @UpdateDateColumn() updatedAt:Date; }
