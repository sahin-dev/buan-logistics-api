import { Role } from "generated/prisma/enums"

export type TokenPayload = {

    userId:string
    username:string
    role:Role

}