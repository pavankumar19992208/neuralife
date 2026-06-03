import {appSchema, tableSchema} from '@nozbe/watermelondb';

export const dbSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'attendance_drafts',
      columns: [
        {name: 'school_id',       type: 'string'},
        {name: 'class_year',      type: 'number'},
        {name: 'section',         type: 'string'},
        {name: 'attendance_date', type: 'string'},  // 'YYYY-MM-DD'
        {name: 'draft_json',      type: 'string'},  // JSON StudentDraft[]
        {name: 'is_submitted',    type: 'boolean'},
        {name: 'submitted_at',    type: 'string', isOptional: true},
        {name: 'updated_at',      type: 'number'},  // ms timestamp
      ],
    }),
  ],
});
