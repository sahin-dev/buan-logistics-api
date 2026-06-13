import { Injectable, BadRequestException, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordHasher } from "./utils/PasswordHasher";
import { RegisterUserDto } from "./dtos/RegisterUserDto";
import { SignInUserDto } from "./dtos/SignInUserDto";
import { AuthResponseDto } from "./dtos/AuthResponseDto";

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prismaService: PrismaService,
        private readonly passwordHasher: PasswordHasher,
        private readonly jwtService: JwtService,
    ) {}

    /**
     * Register a new user
     * @param registerUserDto - User registration data
     * @returns AuthResponseDto with token and user info
     */
    async register(registerUserDto: RegisterUserDto): Promise<AuthResponseDto> {
        const { email, password, confirmPassword, firstName, lastName } = registerUserDto;

        // Validate passwords match
        if (password !== confirmPassword) {
            throw new BadRequestException("Passwords does not matched!");
        }

        // Check if email already exists
        const isEmailUnique = await this.checkEmailUniqueness(email);
        if (!isEmailUnique) {
            throw new BadRequestException("Email is already in use");
        }

        try {
            // Hash password
            const hashedPassword = await this.passwordHasher.hashPassword(password);

            // Create user with profile
            const user = await this.prismaService.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    provider: "local",
                    role: "USER",
                    profile: {
                        create: {
                            firstName,
                            lastName,
                        },
                    },
                },
                include: {
                    profile: true,
                },
            });

            // Generate JWT token
            const token = this.generateToken(user.id, user.role);

            return {
                token,
                email: user.email,
                role: user.role,
            };
        } catch (error) {
            this.logger.error("Error registering user:", error);
            throw new BadRequestException("Failed to register user");
        }
    }

    /**
     * Sign in a user
     * @param signInUserDto - User sign in credentials
     * @returns AuthResponseDto with token and user info
     */
    async signin(signInUserDto: SignInUserDto): Promise<AuthResponseDto> {
        const { email, password, role } = signInUserDto;

        try {
            // Find user by email
            const user = await this.prismaService.user.findUnique({
                where: { email },
                include: {
                    profile: true,
                },
            });

            if (!user) {
                throw new UnauthorizedException("Invalid email or password");
            }

            // Verify password
            const isPasswordValid = await this.passwordHasher.comparePassword(
                password,
                user.password!,
            );

            if (!isPasswordValid) {
                throw new UnauthorizedException("Invalid email or password");
            }

            // Verify role matches
            if (user.role.toLowerCase() !== role.toLowerCase()) {
                throw new UnauthorizedException("Invalid role");
            }

            // Generate JWT token
            const token = this.generateToken(user.id, user.role);

            return {
                token,
                email: user.email,
                role: user.role,
            };
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            this.logger.error("Error signing in user:", error);
            throw new BadRequestException("Failed to sign in");
        }
    }



    /**
     * Generate JWT token for a user
     * @param userId - User ID
     * @param role - User role
     * @returns JWT token string
     */
    generateToken(userId: string, role: string): string {
        const payload = {
            sub: userId,
            role: role,
        };
        return this.jwtService.sign(payload);
    }


    async checkEmailUniqueness(email: string): Promise<boolean> {
        const existingUser = await this.prismaService.user.findUnique({
            where: { email },
        });
        return !existingUser;
    }




}