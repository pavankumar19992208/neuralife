export type RootStackParamList = {
  Login:          undefined;
  OTP:            {mobile: string; devOtp?: string};
  TeacherApp:     undefined;
  Profile:        undefined;
  AttendanceMark: {
    classYear:     number;
    section:       string;
    subject:       string;
    date:          string;    // 'YYYY-MM-DD'
    periodNumber?: number;
  };
  StudentDetail: {
    neuraId:   string;
    name:      string;
    classYear: number;
    section:   string;
    subject:   string;
  };
  MarksEntry: {
    examId:    string;
    examName:  string;
    totalMarks: number;
    classYear: number;
    section:   string;
  };
  SyllabusAnalysis: {
    classYear: number;
    section:   string;
    subject:   string;
  };
};

export type TeacherTabParamList = {
  Home:       undefined;
  Attendance: undefined;
  MyClasses:  undefined;
  MyClass:    undefined;
  Chat:       undefined;
  Profile:    undefined;
};

// Convenience type for screen params
export type AttendanceMarkParams = RootStackParamList['AttendanceMark'];
