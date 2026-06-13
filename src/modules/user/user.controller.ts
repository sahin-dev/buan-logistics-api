import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Patch,
    UseInterceptors,
    UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from "@nestjs/swagger";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dtos/create-user.dto";
import { UpdateUserDto } from "./dtos/update-user.dto";

@ApiTags("Users")
@Controller("users")
export class UserController {
    constructor(private readonly userService: UserService) {}

    /**
     * Get all users
     * @returns List of all users
     */
    @Get()
    @ApiOperation({ summary: "Get all users" })
    @ApiResponse({
        status: 200,
        description: "List of users retrieved successfully",
    })
    
    async getAllUsers() {
        return this.userService.getAllUsers();
    }

    /**
     * Get a user by ID
     * @param id - User ID
     * @returns User details
     */
    @Get(":id")
    @ApiOperation({ summary: "Get user by ID" })
    @ApiResponse({
        status: 200,
        description: "User retrieved successfully",
    })
    @ApiResponse({ status: 404, description: "User not found" })
    async getUserById(@Param("id") id: string) {
        return this.userService.getUserById(id);
    }

    /**
     * Create a new user
     * @param createUserDto - User creation data
     * @returns Created user
     */
    @Post()
    @ApiOperation({ summary: "Create a new user" })
    @ApiResponse({
        status: 201,
        description: "User created successfully",
    })
    @ApiResponse({ status: 400, description: "Bad request" })
    async createUser(@Body() createUserDto: CreateUserDto) {
        return this.userService.createUser(createUserDto);
    }

    /**
     * Update a user
     * @param id - User ID
     * @param updateUserDto - User update data
     * @returns Updated user
     */
    @Put(":id")
    @ApiOperation({ summary: "Update a user" })
    @ApiResponse({
        status: 200,
        description: "User updated successfully",
    })
    @ApiResponse({ status: 404, description: "User not found" })
    @ApiResponse({ status: 400, description: "Bad request" })
    async updateUser(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.userService.updateUser(id, updateUserDto);
    }

    /**
     * Delete a user
     * @param id - User ID
     * @returns Deleted user
     */
    @Delete(":id")
    @ApiOperation({ summary: "Delete a user" })
    @ApiResponse({
        status: 200,
        description: "User deleted successfully",
    })
    @ApiResponse({ status: 404, description: "User not found" })
    async deleteUser(@Param("id") id: string) {
        return this.userService.deleteUser(id);
    }

    /**
     * Block a user
     * @param id - User ID
     * @returns Blocked user
     */
    @Patch(":id/block")
    @ApiOperation({ summary: "Block a user" })
    @ApiResponse({
        status: 200,
        description: "User blocked successfully",
    })
    @ApiResponse({ status: 404, description: "User not found" })
    async blockUser(@Param("id") id: string) {
        return this.userService.blockUser(id);
    }

    /**
     * Upload user avatar
     * @param id - User ID
     * @param file - Avatar file
     * @returns Upload result
     */
    @Post(":id/avatar")
    @UseInterceptors(FileInterceptor("file"))
    @ApiOperation({ summary: "Upload user avatar" })
    @ApiConsumes("multipart/form-data")
    @ApiResponse({
        status: 200,
        description: "Avatar uploaded successfully",
    })
    @ApiResponse({ status: 400, description: "Bad request or invalid file" })
    @ApiResponse({ status: 404, description: "User not found" })
    async uploadAvatar(@Param("id") id: string, @UploadedFile() file: any) {
        return this.userService.uploadAvatar(id, file);
    }
}