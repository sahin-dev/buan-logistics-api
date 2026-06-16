import { Body, Controller, Post, Patch, Get, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterUserDto } from "./dtos/RegisterUserDto";
import { SignInUserDto } from "./dtos/SignInUserDto";
import { AuthResponseDto } from "./dtos/AuthResponseDto";
import { ChangePasswordDto } from "./dtos/ChangePasswordDto";
import { ForgotPasswordDto } from "./dtos/ForgotPasswordDto";
import { ResetPasswordDto } from "./dtos/ResetPasswordDto";
import { JwtAuthGuard } from "src/common/guards/auth.guard";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) { }

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

    /**
     * Change password for the authenticated user
     */
    @Patch("change-password")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Change password for the authenticated user" })
    @ApiResponse({ status: 200, description: "Password changed successfully" })
    @ApiResponse({ status: 400, description: "Bad request" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async changePassword(
        @Request() req: any,
        @Body() changePasswordDto: ChangePasswordDto,
    ) {
        const userId = req.payload.userId;
        return this.authService.changePassword(userId, changePasswordDto);
    }

    /**
     * Request a password reset OTP code
     */
    @Post("forgot-password")
    @ApiOperation({ summary: "Request a password reset OTP code" })
    @ApiResponse({ status: 200, description: "If the email is registered, a password reset code has been sent" })
    @ApiResponse({ status: 400, description: "Bad request" })
    async forgotPassword(
        @Body() forgotPasswordDto: ForgotPasswordDto,
    ) {
        return this.authService.forgotPassword(forgotPasswordDto.email);
    }

    /**
     * Reset password using OTP code
     */
    @Post("reset-password")
    @ApiOperation({ summary: "Reset password using OTP code" })
    @ApiResponse({ status: 200, description: "Password has been reset successfully" })
    @ApiResponse({ status: 400, description: "Bad request" })
    async resetPassword(
        @Body() resetPasswordDto: ResetPasswordDto,
    ) {
        return this.authService.resetPassword(resetPasswordDto);
    }

    /**
     * Get user details and profile details for the authenticated user
     */
    @Get("profile")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get user details and profile details for the authenticated user" })
    @ApiResponse({ status: 200, description: "Successfully retrieved profile details" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async getProfile(@Request() req: any) {
        const userId = req.payload.userId;
        return this.authService.getProfile(userId);
    }
}