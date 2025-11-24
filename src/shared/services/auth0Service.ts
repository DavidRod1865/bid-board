interface Auth0User {
  user_id: string;
  email: string;
  name: string;
  email_verified: boolean;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

// Removed unused CreateUserRequest interface

interface Auth0ManagementToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

class Auth0ManagementService {
  private domain: string;
  private clientId: string;
  private clientSecret: string;
  private audience: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.domain = import.meta.env.VITE_AUTH0_DOMAIN;
    this.clientId = import.meta.env.VITE_AUTH0_MANAGEMENT_CLIENT_ID;
    this.clientSecret = import.meta.env.VITE_AUTH0_MANAGEMENT_CLIENT_SECRET;
    this.audience = import.meta.env.VITE_AUTH0_MANAGEMENT_AUDIENCE;

    if (!this.domain || !this.clientId || !this.clientSecret || !this.audience) {
      console.warn('Auth0 Management API credentials not configured. User invitation features will be disabled.');
    }
  }

  /**
   * Check if Auth0 Management API is properly configured
   */
  isConfigured(): boolean {
    return !!(this.domain && this.clientId && this.clientSecret && this.audience);
  }

  /**
   * Get access token for Auth0 Management API
   */
  private async getAccessToken(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Auth0 Management API not configured');
    }

    // Check if current token is still valid (with 5 minute buffer)
    const now = Date.now();
    if (this.accessToken && now < (this.tokenExpiresAt - 5 * 60 * 1000)) {
      return this.accessToken;
    }

    try {
      const response = await fetch(`https://${this.domain}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          audience: this.audience,
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get Auth0 access token: ${response.status}`);
      }

      const tokenData: Auth0ManagementToken = await response.json();
      
      this.accessToken = tokenData.access_token;
      this.tokenExpiresAt = now + (tokenData.expires_in * 1000);
      
      return this.accessToken;
    } catch (error) {
      throw new Error(
        error instanceof Error 
          ? `Auth0 Management API authentication failed: ${error.message}`
          : 'Auth0 Management API authentication failed'
      );
    }
  }

  /**
   * Make authenticated request to Auth0 Management API
   */
  private async makeManagementRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    
    const response = await fetch(`https://${this.domain}/api/v2${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Auth0 API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  // Removed unused generateTemporaryPassword method

  /**
   * Create a new user in Auth0 with invitation setup
   */
  async createUserWithInvitation(
    email: string, 
    name: string, 
    role: string,
    invitedBy: string
  ): Promise<Auth0User> {
    if (!this.isConfigured()) {
      throw new Error('Auth0 Management API not configured');
    }

    try {
      // Generate a temporary password for the user
      const tempPassword = this.generateSecurePassword();
      
      const userData = {
        email,
        name,
        password: tempPassword,
        email_verified: false,
        user_metadata: {
          role,
          invited: true,
          invited_by: invitedBy,
          invited_at: new Date().toISOString(),
        },
        connection: 'Username-Password-Authentication'
      };

      // Create user in Auth0
      const auth0User = await this.makeManagementRequest<Auth0User>('/users', 'POST', userData);
      
      // Send password reset email instead of verification email
      // This allows the user to set their own password
      await this.sendPasswordResetEmail(auth0User.email);
      
      console.log('Auth0Service: Successfully created Auth0 user:', auth0User.email);
      return auth0User;
      
    } catch (error) {
      console.error('Auth0Service: Failed to create user:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to create Auth0 user: ${error.message}`
          : 'Failed to create Auth0 user'
      );
    }
  }

  /**
   * Generate a secure temporary password
   */
  private generateSecurePassword(): string {
    const length = 16;
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = lowercase + uppercase + digits + symbols;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += digits[Math.floor(Math.random() * digits.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Send welcome email to user (triggers Auth0's email verification)
   */
  async sendWelcomeEmail(userId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Auth0 Management API not configured');
    }

    try {
      await this.makeManagementRequest(`/users/${encodeURIComponent(userId)}/send-verification-email`, 'POST', {});
      console.log('Auth0Service: Verification email sent successfully');
    } catch (error) {
      console.error('Auth0Service: Failed to send verification email:', error);
      // Don't throw error here to avoid breaking the user creation flow
      // The user creation succeeded, email sending failed
    }
  }

  /**
   * Send password reset email (can be used for re-invitations)
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Auth0 Management API not configured');
    }

    try {
      const response = await fetch(`https://${this.domain}/dbconnections/change_password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: import.meta.env.VITE_AUTH0_CLIENT_ID,
          email: email,
          connection: 'Username-Password-Authentication',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send password reset: ${response.status}`);
      }
    } catch (error) {
      throw new Error(
        error instanceof Error 
          ? `Failed to send password reset: ${error.message}`
          : 'Failed to send password reset'
      );
    }
  }

  /**
   * Update user metadata in Auth0
   */
  async updateUserMetadata(
    userId: string, 
    metadata: Record<string, unknown>
  ): Promise<Auth0User> {
    if (!this.isConfigured()) {
      throw new Error('Auth0 Management API not configured');
    }

    try {
      return await this.makeManagementRequest<Auth0User>(
        `/users/${userId}`, 
        'PATCH', 
        { user_metadata: metadata }
      );
    } catch (error) {
      throw new Error(
        error instanceof Error 
          ? `Failed to update user metadata: ${error.message}`
          : 'Failed to update user metadata'
      );
    }
  }

  /**
   * Get user by email from Auth0
   */
  async getUserByEmail(email: string): Promise<Auth0User | null> {
    if (!this.isConfigured()) {
      throw new Error('Auth0 Management API not configured');
    }

    try {
      const users = await this.makeManagementRequest<Auth0User[]>(
        `/users-by-email?email=${encodeURIComponent(email)}`
      );
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      throw new Error(
        error instanceof Error 
          ? `Failed to get user by email: ${error.message}`
          : 'Failed to get user by email'
      );
    }
  }

  /**
   * Delete user from Auth0
   */
  async deleteUser(userId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Auth0 Management API not configured');
    }

    try {
      await this.makeManagementRequest(`/users/${userId}`, 'DELETE');
    } catch (error) {
      throw new Error(
        error instanceof Error 
          ? `Failed to delete Auth0 user: ${error.message}`
          : 'Failed to delete Auth0 user'
      );
    }
  }

  /**
   * Test Auth0 Management API configuration
   */
  async testConfiguration(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      await this.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const auth0Service = new Auth0ManagementService();
export default auth0Service;