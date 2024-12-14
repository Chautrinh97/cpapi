import path from 'path';

export const documentNameEditor = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, filename: string) => void,
) => {
  const fileExt = path.extname(file.originalname);
  const newFileName = `${Date.now()}-${file.originalname.replace(fileExt, '')}${fileExt}`;
  callback(null, newFileName);
};

export const documentFilter = (request: Request, file: any, callback) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new Error('Only .pdf and .doc/.docx files are allowed'),
      false,
    );
  }
  callback(null, true);
};
