import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Patch,
    Query,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    Request,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dtos/create-user.dto";
import { UpdateUserDto } from "./dtos/update-user.dto";
import { UpdateProfileDto } from "./dtos/update-profile.dto";
import { ApplyUpgradeDto } from "./dtos/apply-upgrade.dto";
import { HubProviderApplicationDto } from "./dtos/hub-provider-application.dto";
import { CreateCorporateApplicationDto } from "./dtos/create-corporate-application.dto";
import { UpdateUpgradeApplicationDto } from "./dtos/update-upgrade-application.dto";
import { UpdateHubProviderApplicationDto } from "./dtos/update-hub-provider-application.dto";
import { UpdateCorporatePartnerApplicationDto } from "./dtos/update-corporate-partner-application.dto";
import { JwtAuthGuard } from "src/common/guards/auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { Role, ApplicationStatus } from "generated/prisma/enums";
import { PaginationQueryDto } from "src/common/dtos/pagination-query.dto";
import { ReviewApplicationDto } from "./dtos/review-application.dto";
import { mapUserResponse } from "src/common/utils/role-mapper.util";

@ApiTags("Users")
@Controller("users")
export class UserController {
    constructor(private readonly userService: UserService) { }

    /**
     * Get all users
     * @returns List of all users
     */
    @Get()
    @ApiOperation({ summary: "Get all users (paginated, supports ?page=1&limit=10&search=keyword)" })
    @ApiResponse({
        status: 200,
        description: "Paginated list of users retrieved successfully",
    })
    async getAllUsers(@Query() query: PaginationQueryDto) {
        const result = await this.userService.getAllUsers(query);
        return mapUserResponse(result);
    }

    /**
     * Update the authenticated user's own profile
     * Supports avatar upload along with text fields
     */
    @Patch("me")
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor("avatar"))
    @ApiBearerAuth()
    @ApiOperation({ summary: "Update own profile (avatar, name, phone, address)" })
    @ApiConsumes("multipart/form-data")
    @ApiBody({ type: UpdateProfileDto })
    @ApiResponse({
        status: 200,
        description: "Profile updated successfully",
    })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async updateMyProfile(
        @Request() req: any,
        @Body() dto: UpdateProfileDto,
        @UploadedFile() file?: any,
    ) {
        const userId = req.payload.userId;
        const result = await this.userService.updateMyProfile(userId, dto, file);
        return mapUserResponse(result);
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
        const result = await this.userService.getUserById(id);
        return mapUserResponse(result);
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
        const result = await this.userService.createUser(createUserDto);
        return mapUserResponse(result);
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
        const result = await this.userService.updateUser(id, updateUserDto);
        return mapUserResponse(result);
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
        description: "Delete a user",
    })
    @ApiResponse({ status: 404, description: "User not found" })
    async deleteUser(@Param("id") id: string) {
        const result = await this.userService.deleteUser(id);
        return mapUserResponse(result);
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
        const result = await this.userService.blockUser(id);
        return mapUserResponse(result);
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

    @Post("apply-upgrade")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Apply for a tier upgrade (T1 -> T2/T3)" })
    async applyUpgrade(@Request() req: any, @Body() dto: ApplyUpgradeDto) {
        const userId = req.payload.userId;
        return this.userService.applyForUpgrade(userId, dto);
    }

    @Post("apply-hub-provider")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Apply to become a hub provider" })
    async applyHubProvider(@Body() dto: HubProviderApplicationDto) {
        return this.userService.applyForHubProvider(dto);
    }

    @Post("apply-corporate-partner")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Apply to become a corporate partner / business partner" })
    async applyCorporatePartner(@Request() req: any, @Body() dto: CreateCorporateApplicationDto) {
        const userId = req.payload.userId;
        return this.userService.applyForCorporatePartner(userId, dto);
    }

    @Get("me/upgrade-applications")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get own upgrade applications (paginated) — supports ?page=1&limit=10" })
    async getMyUpgradeApplications(@Request() req: any, @Query() query: PaginationQueryDto) {
        const userId = req.payload.userId;
        const result = await this.userService.getMyUpgradeApplications(userId, query);
        return mapUserResponse(result);
    }

    @Get("me/hub-provider-applications")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get own hub provider applications (paginated) — supports ?page=1&limit=10" })
    async getMyHubProviderApplications(@Request() req: any, @Query() query: PaginationQueryDto) {
        const userId = req.payload.userId;
        return this.userService.getMyHubProviderApplications(userId, query);
    }

    @Get("me/corporate-applications")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get own corporate partner applications (paginated) — supports ?page=1&limit=10" })
    async getMyCorporateApplications(@Request() req: any, @Query() query: PaginationQueryDto) {
        const userId = req.payload.userId;
        const result = await this.userService.getMyCorporateApplications(userId, query);
        return mapUserResponse(result);
    }

    @Get("upgrade-applications")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get all tier upgrade applications (Admin only) — supports ?page=1&limit=10" })
    async getUpgradeApplications(@Query() query: PaginationQueryDto) {
        const result = await this.userService.getUpgradeApplications(query);
        return mapUserResponse(result);
    }

    @Get("hub-provider-applications")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get all hub provider applications (Admin only) — supports ?page=1&limit=10" })
    async getHubProviderApplications(@Query() query: PaginationQueryDto) {
        return this.userService.getHubProviderApplications(query);
    }

    @Get("corporate-applications")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get all corporate partner applications (Admin only) — supports ?page=1&limit=10" })
    async getCorporatePartnerApplications(@Query() query: PaginationQueryDto) {
        const result = await this.userService.getCorporatePartnerApplications(query);
        return mapUserResponse(result);
    }

    @Put("upgrade-applications/:id/review")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Review upgrade application (Admin only)" })
    async reviewUpgradeApplication(
        @Param("id") id: string,
        @Body() reviewApplicationDto: ReviewApplicationDto
    ) {
        return this.userService.reviewUpgradeApplication(id, reviewApplicationDto.status, reviewApplicationDto.notes);
    }

    @Put("hub-provider-applications/:id/review")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Review hub provider application (Admin only)" })
    async reviewHubProviderApplication(
        @Param("id") id: string,
        @Body() reviewApplicationDto: ReviewApplicationDto
    ) {
        return this.userService.reviewHubProviderApplication(id, reviewApplicationDto.status, reviewApplicationDto.notes);
    }

    @Put("corporate-applications/:id/review")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Review corporate partner application (Admin only)" })
    async reviewCorporatePartnerApplication(
        @Param("id") id: string,
        @Body() reviewApplicationDto: ReviewApplicationDto
    ) {
        return this.userService.reviewCorporatePartnerApplication(id, reviewApplicationDto.status, reviewApplicationDto.notes);
    }

    @Patch("upgrade-applications/:id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Update upgrade application (Admin or Owner)" })
    async updateUpgradeApplication(
        @Request() req: any,
        @Param("id") id: string,
        @Body() dto: UpdateUpgradeApplicationDto
    ) {
        const { userId, role } = req.payload;
        return this.userService.updateUpgradeApplication(id, userId, role, dto);
    }

    @Patch("hub-provider-applications/:id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Update hub provider application (Admin or Owner)" })
    async updateHubProviderApplication(
        @Request() req: any,
        @Param("id") id: string,
        @Body() dto: UpdateHubProviderApplicationDto
    ) {
        const { userId, role } = req.payload;
        return this.userService.updateHubProviderApplication(id, userId, role, dto);
    }

    @Patch("corporate-applications/:id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Update corporate partner application (Admin or Owner)" })
    async updateCorporatePartnerApplication(
        @Request() req: any,
        @Param("id") id: string,
        @Body() dto: UpdateCorporatePartnerApplicationDto
    ) {
        const { userId, role } = req.payload;
        return this.userService.updateCorporatePartnerApplication(id, userId, role, dto);
    }
    }