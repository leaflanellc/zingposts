export type ActionErrorCode=
  |'ACTION_FAILED'
  |'AGENT_AUTHENTICATION_REQUIRED'
  |'AUTHENTICATION_REQUIRED'
  |'CONFLICT'
  |'HUMAN_REQUIRED'
  |'INVALID_INPUT'
  |'INVALID_TRANSITION'
  |'NOT_FOUND'
  |'VERIFICATION_REQUIRED';

export class ActionError extends Error{
  code:ActionErrorCode;
  retryable:boolean;
  details:Record<string,unknown>;

  constructor(code:ActionErrorCode,message:string,details:Record<string,unknown>={},retryable=false){
    super(message);
    this.name='ActionError';
    this.code=code;
    this.retryable=retryable;
    this.details=details;
  }
}

export function invalidInput(message:string,details:Record<string,unknown>={}){
  return new ActionError('INVALID_INPUT',message,details);
}

export function notFound(resourceType:string,resourceId:string){
  return new ActionError('NOT_FOUND',`${resourceType} not found.`,{resourceType,resourceId});
}

export function invalidTransition(resourceType:string,resourceId:string,currentStatus:string,requestedStatus:string,allowedNext:string[]){
  return new ActionError('INVALID_TRANSITION',`Cannot change ${resourceType} from ${currentStatus} to ${requestedStatus}.`,{resourceType,resourceId,currentStatus,requestedStatus,allowedNext});
}

export function versionConflict(resourceType:string,resourceId:string,expectedVersion:number,currentVersion:number){
  return new ActionError('CONFLICT',`${resourceType} changed after it was read. Refresh it and retry with the current version.`,{resourceType,resourceId,expectedVersion,currentVersion},true);
}
