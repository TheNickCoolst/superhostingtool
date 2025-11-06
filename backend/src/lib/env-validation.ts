/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 * Prevents the application from starting with invalid configuration
 */

interface RequiredEnvVars {
  [key: string]: {
    required: boolean;
    description: string;
    validator?: (value: string) => boolean;
  };
}

const envSchema: RequiredEnvVars = {
  NODE_ENV: {
    required: true,
    description: 'Node environment (development, production, test)',
    validator: (val) => ['development', 'production', 'test'].includes(val)
  },
  PORT: {
    required: false,
    description: 'API server port (default: 3000)',
    validator: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) < 65536
  },
  WS_PORT: {
    required: false,
    description: 'WebSocket server port (default: 3001)',
    validator: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) < 65536
  },
  DATABASE_URL: {
    required: true,
    description: 'PostgreSQL database connection URL',
    validator: (val) => val.startsWith('postgresql://') || val.startsWith('postgres://')
  },
  JWT_SECRET: {
    required: true,
    description: 'Secret key for JWT token signing (min 32 characters)',
    validator: (val) => val.length >= 32
  },
  JWT_EXPIRES_IN: {
    required: false,
    description: 'JWT token expiration time (default: 7d)'
  },
  ALLOWED_ORIGINS: {
    required: false,
    description: 'Comma-separated list of allowed CORS origins (default: http://localhost:5173)'
  },
  RATE_LIMIT_WINDOW_MS: {
    required: false,
    description: 'Rate limit window in milliseconds (default: 900000 / 15 minutes)',
    validator: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0
  },
  RATE_LIMIT_MAX_REQUESTS: {
    required: false,
    description: 'Maximum number of requests per window (default: 100)',
    validator: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0
  }
};

export function validateEnvironment(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('🔍 Validating environment variables...');

  for (const [key, config] of Object.entries(envSchema)) {
    const value = process.env[key];

    // Check if required variable is missing
    if (config.required && !value) {
      errors.push(`❌ Missing required environment variable: ${key} - ${config.description}`);
      continue;
    }

    // Validate the value if validator is provided and value exists
    if (value && config.validator && !config.validator(value)) {
      errors.push(`❌ Invalid value for ${key}: ${config.description}`);
    }

    // Warn about optional variables that are not set
    if (!config.required && !value) {
      warnings.push(`⚠️  Optional environment variable not set: ${key} - ${config.description}`);
    }
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  Environment Warnings:');
    warnings.forEach(warning => console.log(`  ${warning}`));
  }

  // Print errors and exit if any
  if (errors.length > 0) {
    console.error('\n❌ Environment Validation Failed:');
    errors.forEach(error => console.error(`  ${error}`));
    console.error('\n💡 Please check your .env file and ensure all required variables are set correctly.');
    process.exit(1);
  }

  console.log('✅ Environment validation passed\n');
}

/**
 * Get environment variable with type safety and default value
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is not set and no default value provided`);
  }
  return value || defaultValue!;
}

/**
 * Get environment variable as number
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is not set and no default value provided`);
    }
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} is not a valid number: ${value}`);
  }
  return parsed;
}

/**
 * Get environment variable as boolean
 */
export function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (!value) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is not set and no default value provided`);
    }
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}
