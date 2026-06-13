import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterUserDto } from "./dtos/RegisterUserDto";
import { SignInUserDto } from "./dtos/SignInUserDto";
import { AuthResponseDto } from "./dtos/AuthResponseDto";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * Register a new user
     * @param registerUserDto - User registration data
     * @returns AuthResponseDto with token and user info
     */
    @Post("register")
    @ApiOperation({ summary: "Register a new user" })
    @ApiResponse({
        status: 201,
        description: "User registered successfully",
        type: AuthResponseDto,
    })
    @ApiResponse({ status: 400, description: "Bad request" })
    async register(@Body() registerUserDto: RegisterUserDto): Promise<AuthResponseDto> {
        return this.authService.register(registerUserDto);
    }

    /**
     * Sign in a user
     * @param signInUserDto - User sign in credentials
     * @returns AuthResponseDto with token and user info
     */
    @Post("signin")
    @ApiOperation({ summary: "Sign in a user" })
    @ApiResponse({
        status: 200,
        description: "User signed in successfully",
        type: AuthResponseDto,
    })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async signin(@Body() signInUserDto: SignInUserDto): Promise<AuthResponseDto> {
        return this.authService.signin(signInUserDto);
    }
}