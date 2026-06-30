import { Body, Controller, Post, Patch, Get, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterUserDto } from "./dtos/RegisterUserDto";
import { SignInUserDto } from "./dtos/SignInUserDto";
import { AuthResponseDto } from "./dtos/AuthResponseDto";
import { ChangePasswordDto } from "./dtos/ChangePasswordDto";
import { ForgotPasswordDto } from "./dtos/ForgotPasswordDto";
import { ResetPasswordDto } from "./dtos/ResetPasswordDto";
import { VerifyOtpDto } from "./dtos/VerifyOtpDto";
import { ResetPasswordNewDto } from "./dtos/ResetPasswordNewDto";
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
     * Resend password reset OTP code
     */
    @Post("resend-otp")
    @ApiOperation({ summary: "Resend password reset OTP code" })
    @ApiResponse({ status: 200, description: "If the email is registered, a new password reset code has been sent" })
    @ApiResponse({ status: 400, description: "Bad request" })
    async resendOtp(
        @Body() forgotPasswordDto: ForgotPasswordDto,
    ) {
        return this.authService.resendOtp(forgotPasswordDto.email);
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
     * Verify OTP code
     */
    @Post("verify-otp")
    @ApiOperation({ summary: "Verify password reset OTP code" })
    @ApiResponse({ status: 200, description: "OTP is valid" })
    @ApiResponse({ status: 400, description: "Bad request" })
    async verifyOtp(
        @Body() verifyOtpDto: VerifyOtpDto,
    ) {
        return this.authService.verifyOtp(verifyOtpDto.token);
    }

    /**
     * Reset password using newPassword and confirmPassword after OTP verification
     */
    @Post("reset-password-new")
    @ApiOperation({ summary: "Reset password using new password and confirm password" })
    @ApiResponse({ status: 200, description: "Password has been reset successfully" })
    @ApiResponse({ status: 400, description: "Bad request" })
    async resetPasswordNew(
        @Body() resetPasswordNewDto: ResetPasswordNewDto,
    ) {
        return this.authService.resetPasswordNew(
            resetPasswordNewDto.token,
            resetPasswordNewDto.newPassword,
            resetPasswordNewDto.confirmPassword,
        );
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