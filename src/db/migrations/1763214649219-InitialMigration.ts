import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1763214649219 implements MigrationInterface {
  name = 'InitialMigration1763214649219';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "expense" ("id" SERIAL NOT NULL, "amount" numeric(10,2) NOT NULL, "description" character varying, "category" character varying, "date" date NOT NULL DEFAULT ('now'::text)::date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, CONSTRAINT "PK_edd925b450e13ea36197c9590fc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "phoneNumber" character varying NOT NULL, CONSTRAINT "UQ_f2578043e491921209f5dadd080" UNIQUE ("phoneNumber"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense" ADD CONSTRAINT "FK_06e076479515578ab1933ab4375" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "expense" DROP CONSTRAINT "FK_06e076479515578ab1933ab4375"`,
    );
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "expense"`);
  }
}
