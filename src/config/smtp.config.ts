import { registerAs } from "@nestjs/config"

export const smtpConfig = ()=> ({

    host:process.env.SMTP_HOST,
    port:parseInt(process.env.SMTP_PORT as string),
    user:process.env.SMTP_USER,
    password:process.env.SMTP_PASSWORD
})

export default registerAs("smtp",smtpConfig)