import { executeQuery } from "../config/supabase.js";

const mapUserRecord = (row) => ({
  userId: row.UserId,
  name: row.Name,
  surname: row.Surname,
  dateOfBirth: row.DateOfBirth,
  occupation: row.Occupation,
  email: row.Email,
  passwordHash: row.PasswordHash,
  authProvider: row.AuthProvider,
  externalAuthId: row.ExternalAuthId,
  createdAt: row.CreatedAt,
  updatedAt: row.UpdatedAt,
});

export const userRepository = {
  async findByEmail(email) {
    const result = await executeQuery((request, sql) =>
      request.input("email", sql.NVarChar(255), email).query(`
          SELECT TOP (1) *
          FROM UserAccount
          WHERE Email = @email;
        `),
    );

    return result.recordset[0] ? mapUserRecord(result.recordset[0]) : null;
  },

  async findByProvider(provider, externalAuthId) {
    const result = await executeQuery((request, sql) =>
      request
        .input("provider", sql.NVarChar(50), provider)
        .input("externalAuthId", sql.NVarChar(255), externalAuthId).query(`
          SELECT TOP (1) *
          FROM UserAccount
          WHERE AuthProvider = @provider
            AND ExternalAuthId = @externalAuthId;
        `),
    );

    return result.recordset[0] ? mapUserRecord(result.recordset[0]) : null;
  },

  async findById(userId) {
    const result = await executeQuery((request, sql) =>
      request.input("userId", sql.Int, userId).query(`
          SELECT TOP (1) *
          FROM UserAccount
          WHERE UserId = @userId;
        `),
    );

    return result.recordset[0] ? mapUserRecord(result.recordset[0]) : null;
  },

  async createLocalUser({
    name,
    surname,
    dateOfBirth,
    occupation,
    email,
    passwordHash,
  }) {
    const result = await executeQuery((request, sql) =>
      request
        .input("name", sql.NVarChar(100), name)
        .input("surname", sql.NVarChar(100), surname)
        .input("dateOfBirth", sql.Date, dateOfBirth || null)
        .input("occupation", sql.NVarChar(150), occupation || null)
        .input("email", sql.NVarChar(255), email)
        .input("passwordHash", sql.NVarChar(255), passwordHash).query(`
          INSERT INTO UserAccount (
            Name,
            Surname,
            DateOfBirth,
            Occupation,
            Email,
            PasswordHash,
            AuthProvider
          )
          OUTPUT INSERTED.*
          VALUES (
            @name,
            @surname,
            @dateOfBirth,
            @occupation,
            @email,
            @passwordHash,
            'local'
          );
        `),
    );

    return mapUserRecord(result.recordset[0]);
  },

  async createSocialUser({ name, surname, email, provider, externalAuthId }) {
    const result = await executeQuery((request, sql) =>
      request
        .input("name", sql.NVarChar(100), name)
        .input("surname", sql.NVarChar(100), surname)
        .input("email", sql.NVarChar(255), email)
        .input("provider", sql.NVarChar(50), provider)
        .input("externalAuthId", sql.NVarChar(255), externalAuthId).query(`
          INSERT INTO UserAccount (
            Name,
            Surname,
            Email,
            AuthProvider,
            ExternalAuthId
          )
          OUTPUT INSERTED.*
          VALUES (
            @name,
            @surname,
            @email,
            @provider,
            @externalAuthId
          );
        `),
    );

    return mapUserRecord(result.recordset[0]);
  },

  async linkSocialProvider(userId, provider, externalAuthId) {
    await executeQuery((request, sql) =>
      request
        .input("userId", sql.Int, userId)
        .input("provider", sql.NVarChar(50), provider)
        .input("externalAuthId", sql.NVarChar(255), externalAuthId).query(`
          UPDATE UserAccount
          SET AuthProvider = @provider,
              ExternalAuthId = @externalAuthId,
              UpdatedAt = SYSDATETIMEOFFSET()
          WHERE UserId = @userId;
        `),
    );
  },

  async updateUserProfile(userId, updates) {
    const result = await executeQuery((request, sql) =>
      request
        .input("userId", sql.Int, userId)
        .input("name", sql.NVarChar(100), updates.name || null)
        .input("surname", sql.NVarChar(100), updates.surname || null)
        .input("occupation", sql.NVarChar(150), updates.occupation || null)
        .input("email", sql.NVarChar(255), updates.email || null).query(`
          UPDATE UserAccount
          SET Name = COALESCE(@name, Name),
              Surname = COALESCE(@surname, Surname),
              Occupation = COALESCE(@occupation, Occupation),
              Email = COALESCE(@email, Email),
              UpdatedAt = SYSDATETIMEOFFSET()
          OUTPUT INSERTED.*
          WHERE UserId = @userId;
        `),
    );

    return result.recordset[0] ? mapUserRecord(result.recordset[0]) : null;
  },

  async updatePassword(userId, passwordHash) {
    await executeQuery((request, sql) =>
      request
        .input("userId", sql.Int, userId)
        .input("passwordHash", sql.NVarChar(255), passwordHash).query(`
          UPDATE UserAccount
          SET PasswordHash = @passwordHash,
              UpdatedAt = SYSDATETIMEOFFSET()
          WHERE UserId = @userId;
        `),
    );
  },

  async addSearchHistory(userId, searchTerm, filterJson) {
    const result = await executeQuery((request, sql) =>
      request
        .input("userId", sql.Int, userId)
        .input("searchTerm", sql.NVarChar(200), searchTerm)
        .input("filterJson", sql.NVarChar(sql.MAX), filterJson || null).query(`
          INSERT INTO UserSearchHistory (UserId, SearchTerm, FilterJson)
          OUTPUT INSERTED.*
          VALUES (@userId, @searchTerm, @filterJson);
        `),
    );

    return result.recordset[0];
  },

  async getSearchHistory(userId, limit = 20, offset = 0) {
    const result = await executeQuery((request, sql) =>
      request
        .input("userId", sql.Int, userId)
        .input("limit", sql.Int, limit)
        .input("offset", sql.Int, offset).query(`
          SELECT SearchId, UserId, SearchTerm, FilterJson, CreatedAt
          FROM UserSearchHistory
          WHERE UserId = @userId
          ORDER BY CreatedAt DESC
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        `),
    );

    return result.recordset;
  },

  async clearSearchHistory(userId) {
    const result = await executeQuery((request, sql) =>
      request.input("userId", sql.Int, userId).query(`
          DELETE FROM UserSearchHistory
          WHERE UserId = @userId;

          SELECT @@ROWCOUNT AS deletedCount;
        `),
    );

    return result.recordset[0]?.deletedCount || 0;
  },
};
