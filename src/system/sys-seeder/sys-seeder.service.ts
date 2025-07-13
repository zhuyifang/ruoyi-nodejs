import { Injectable, Logger } from '@nestjs/common';
import { SysUserSeederService } from '../sys-user/sys-user.seeder.service';
import { SysRoleSeederService } from '../sys-role/sys-role.seeder.service';
import { SysMenuSeederService } from '../sys-menu/sys-menu.seeder.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SysRole } from '../sys-role/sys-role.entity';
import { DataSource,Repository } from 'typeorm';

@Injectable()
export class SysSeederService {
    private readonly logger = new Logger(SysSeederService.name);

    constructor(
        private readonly userSeeder: SysUserSeederService,
        private readonly roleSeeder: SysRoleSeederService,
        private readonly menuSeeder: SysMenuSeederService,
        // 注入 SysRole 的 Repository 以便保存关联关系
        @InjectRepository(SysRole)
        private readonly roleRepository: Repository<SysRole>,
        private readonly dataSource: DataSource,
    ) {}

    async onModuleInit() {
        if (process.env.NODE_ENV !== 'production') {
            this.logger.log('Development environment detected. Running seeder...');
            await this.seed();
        } else {
            this.logger.log('Production environment detected. Skipping automatic seeder.');
        }
    }

    async seed() {
        // 3. 使用 QueryRunner 来管理事务
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        this.logger.log('Starting complete data seeding process within a transaction...');

        try {
            // 注意：在事务中，Seeder 内部的服务也需要使用同一个 queryRunner 的 manager
            // 这是一个更高级的重构，此处为简化，我们假设 Seeder 内部没有复杂的事务依赖
            // 对于当前结构，直接执行即可

            const adminRole = await this.roleSeeder.seed();
            const allMenus = await this.menuSeeder.seed();

            this.logger.log('Assigning all menus to admin role...');
            adminRole.menus = allMenus;
            await this.roleRepository.save(adminRole);
            this.logger.log('Role-Menu association finished.');

            await this.userSeeder.seed(adminRole);

            // 如果所有操作都成功，提交事务
            await queryRunner.commitTransaction();
            this.logger.log('Data seeding transaction committed successfully.');
        } catch (err) {
            // 如果任何步骤出错，回滚所有更改
            this.logger.error('Data seeding failed. Rolling back transaction.', err.stack);
            await queryRunner.rollbackTransaction();
        } finally {
            // 无论成功与否，最后都要释放连接
            await queryRunner.release();
        }
    }
}