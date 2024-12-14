import { MailerService } from '@nestjs-modules/mailer';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';

@Processor({ name: 'send-email' }, { concurrency: 2 })
export class EmailConsumer extends WorkerHost {
  constructor(
    private readonly mailService: MailerService,
    private readonly configService: ConfigService,
  ) {
    super();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async process(job: Job<any, any, string>, token?: string): Promise<any> {
    switch (job.name) {
      case 'verify-email':
        await this.sendEmailConfirmWithTemplate(job.data.email, job.data.token);
        break;
      case 'reset-password':
        await this.sendEmailResetPassword(job.data.email, job.data.token);
        break;
      default:
        throw new Error('No job name match');
    }
  }

  private async sendEmailConfirmWithTemplate(email, token) {
    await this.mailService.sendMail({
      to: email,
      subject: 'Xác minh email',
      template: './base',
      context: {
        email: email.email,
        title: 'Chatbot - Xác minh email',
        heading: 'Xác minh email của bạn.',
        introduction:
          'Bạn nhận được mail này vì email của bạn chưa được xác minh trên hệ thống.',
        instruction:
          'Nhấn vào nút bên dưới để xác minh địa chỉ email và kích hoạt tài khoản. Nếu bạn không tạo tài khoản với ',
        website: `${this.configService.get<string>('WEB_ADDRESS')}`,
        webname: 'Chatbot',
        instruction2: ', bạn có thể xóa email này một cách an toàn.',
        warning: `Đường dẫn này chỉ có hiệu lực trong vòng ${this.configService.get<number>('MINUTES_TO_EXPIPRE_CONFIRM_TOKEN')} phút.`,
        link: `${this.configService.get<string>('WEB_ADDRESS')}/auth/complete-confirm?verify-from=${token}`,
        button: 'Xác minh',
      },
    });
  }

  private async sendEmailResetPassword(email, token) {
    await this.mailService.sendMail({
      to: email,
      subject: 'Đặt lại mật khẩu',
      template: './base',
      context: {
        email: email,
        title: 'Chatbot - Đặt lại mật khẩu',
        heading: 'Thiết lập mật khẩu mới.',
        introduction: 'Bạn nhận được email này vì đã yêu cầu đặt lại mật khẩu.',
        instruction:
          `Nhấn vào nút bên dưới để đặt lại mật khẩu của bạn.` +
          `Nếu không phải bạn gửi yêu cầu, bạn có thể xóa email này một cách an toàn.`,
        website: '',
        webname: '',
        instruction2: '',
        warning: `Đường dẫn đặt lại mật khẩu chỉ có hiệu lực trong vòng ${this.configService.get<number>('MINUTES_TO_EXPIRE_RSPW_TOKEN')} phút.`,
        link: `${this.configService.get<string>('WEB_ADDRESS')}/auth/reset-password?reset-from=${token}`,
        button: 'Đặt lại mật khẩu',
      },
    });
  }
}
