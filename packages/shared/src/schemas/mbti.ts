import { z } from 'zod';
import { MBTI_TYPES } from '../constants';

export const MBTITypeSchema = z.enum(MBTI_TYPES);
