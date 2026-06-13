import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";

/**
 * PasswordHasher - Utility for password hashing and verification
 * Uses bcrypt for secure password hashing
 * Implements industry standard password security practices
 */
@Injectable()
export class PasswordHasher {
    private readonly saltRounds = 10;

    /**
     * Hash a password using bcrypt
     * @param password - Plain text password to hash
     * @returns Promise with hashed password
     */
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.saltRounds);
    }

    /**
     * Compare a plain password with a hashed password
     * @param password - Plain text password
     * @param hashedPassword - Hashed password to compare against
     * @returns Promise with boolean result
     */
    async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(password, hashedPassword);
    }
}
