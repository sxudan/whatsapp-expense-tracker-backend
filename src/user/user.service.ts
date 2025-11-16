import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findOrCreateByPhoneNumber(
    phoneNumber: string,
    name?: string,
  ): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { phoneNumber },
    });

    if (!user) {
      user = this.userRepository.create({
        phoneNumber,
        name: name || `User ${phoneNumber}`,
      });
      user = await this.userRepository.save(user);
    }

    return user;
  }

  async findById(id: number): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }
}
