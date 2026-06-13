import { registerAs } from "@nestjs/config"

export const jwtConfig = ()=> ({
    jwt_secret:process.env.JWT_SECRET,
    expires_in:process.env.JWT_EXPIRES_IN as any,

})

export default registerAs("jwt", jwtConfig)