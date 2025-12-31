export interface ValidationCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

export interface ValidationResult {
  valid: boolean;
  checks: ValidationCheck[];
  summary: string;
}

export interface CloudFormationTemplate {
  Resources?: Record<string, any>;
  Outputs?: Record<string, any>;
  Parameters?: Record<string, any>;
}
