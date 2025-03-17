import { useState, useEffect, useCallback } from 'react';
import { LoaderCircle } from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import './App.css';

// 차량 기본 정보 타입
interface VehicleInfo {
  운행기록장치모델명: string;
  차대번호: string;
  자동차유형: string;
  자동차등록번호: string;
  운송사업자등록번호: string;
  운전자코드: string;
}

// 운행 기록 데이터 타입
interface DriveRecord {
  id: number;
  일일주행거리?: string;
  누적주행거리?: string;
  정보발생일시: string;
  차량속도: string;
  분당엔진회전수: string;
  브레이크신호: string;
  X좌표: string;
  Y좌표: string;
  GPS방위각: string;
  가속도ΔVx: string;
  가속도ΔVy: string;
  기기및통신상태코드: string;
}

// 필드 정의 타입
interface FieldDefinition {
  name: string;
  length: number;
  format?: (value: string) => string;
  adjustForKorean?: boolean; // 한글 길이 조정 필요 여부
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [driveRecords, setDriveRecords] = useState<DriveRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 차량 기본 정보 필드 정의
  const vehicleInfoFields: FieldDefinition[] = [
    {
      name: '운행기록장치모델명',
      length: 20,
      format: (value) => value.replace(/#/g, '').trim(),
    },
    {
      name: '차대번호',
      length: 17,
      format: (value) => value.replace(/#/g, '').trim(),
    },
    {
      name: '자동차유형',
      length: 2,
    },
    {
      name: '자동차등록번호',
      length: 9,
      format: (value) => {
        const cleaned = value.replace(/#/g, '').trim();
        console.log('자동차등록번호 원본:', value, '정제:', cleaned);
        return cleaned;
      },
    },
    {
      name: '운송사업자등록번호',
      length: 10,
      format: (value) => {
        if (value.length === 10) {
          return `${value.substring(0, 3)}-${value.substring(
            3,
            5,
          )}-${value.substring(5)}`;
        }
        return value;
      },
    },
    {
      name: '운전자코드',
      length: 18,
      format: (value) => value.replace(/#/g, '').trim(),
    },
  ];

  // 운행 기록 데이터 필드 정의
  const driveRecordFields: FieldDefinition[] = [
    {
      name: '정보발생일시',
      length: 14,
      format: (value) => {
        if (value.length === 14) {
          // 예시 데이터: 25011100000000
          // 올바른 형식: 2025-01-11 00:00:00.00

          // 데이터 로깅
          console.log('정보발생일시 원본:', value);

          // 각 부분 추출
          const year = value.substring(0, 2);
          const month = value.substring(2, 4);
          const day = value.substring(4, 6);
          const hour = value.substring(6, 8);
          const minute = value.substring(8, 10);
          const second = value.substring(10, 12);
          const ms = value.substring(12, 14);

          // 유효성 검사 및 보정
          const validMonth =
            parseInt(month) > 0 && parseInt(month) <= 12 ? month : '01';
          const validDay =
            parseInt(day) > 0 && parseInt(day) <= 31 ? day : '01';
          const validHour = parseInt(hour) < 24 ? hour : '00';
          const validMinute = parseInt(minute) < 60 ? minute : '00';
          const validSecond = parseInt(second) < 60 ? second : '00';

          const formattedDate = `20${year}-${validMonth}-${validDay} ${validHour}:${validMinute}:${validSecond}.${ms}`;
          console.log('정보발생일시 변환 결과:', formattedDate);

          return formattedDate;
        }
        return value;
      },
    },
    {
      name: '차량속도',
      length: 3,
      format: (value) => {
        // 데이터 로깅
        console.log('차량속도 원본:', value);

        // 3자리 숫자를 정수로 변환
        const speed = parseInt(value, 10) || 0;

        // 값이 비정상적으로 크면 보정 (예: 971km/h는 비정상적)
        const validSpeed =
          speed > 200 ? parseInt(value.substring(0, 2), 10) || 0 : speed;

        const result = `${validSpeed} km/h`;
        console.log('차량속도 변환 결과:', result);
        return result;
      },
    },
    {
      name: '분당엔진회전수',
      length: 4,
      format: (value) => {
        // 데이터 로깅
        console.log('분당엔진회전수 원본:', value);

        // 4자리 숫자를 정수로 변환
        const rpm = parseInt(value, 10) || 0;

        // 값이 비정상적으로 크면 보정
        const validRpm =
          rpm > 10000 ? parseInt(value.substring(0, 3), 10) || 0 : rpm;

        const result = `${validRpm} RPM`;
        console.log('분당엔진회전수 변환 결과:', result);
        return result;
      },
    },
    {
      name: '브레이크신호',
      length: 1,
      format: (value) => (value === '1' ? 'ON' : 'OFF'),
    },
    {
      name: 'X좌표',
      length: 9,
      format: (value) => {
        // 데이터 로깅
        console.log('X좌표 원본:', value);

        // 좌표 변환
        let coord = parseInt(value, 10) / 1000000 || 0;

        // 비정상적인 값 보정
        if (coord > 180 || coord < -180) {
          // 첫 3자리만 사용하여 다시 계산
          const reducedValue = value.substring(0, 3);
          coord = parseInt(reducedValue, 10) / 10 || 0;
        }

        const result = coord.toFixed(6);
        console.log('X좌표 변환 결과:', result);
        return result;
      },
    },
    {
      name: 'Y좌표',
      length: 9,
      format: (value) => {
        // 데이터 로깅
        console.log('Y좌표 원본:', value);

        // 좌표 변환
        let coord = parseInt(value, 10) / 1000000 || 0;

        // 비정상적인 값 보정
        if (coord > 90 || coord < -90) {
          // 첫 2자리만 사용하여 다시 계산
          const reducedValue = value.substring(0, 2);
          coord = parseInt(reducedValue, 10) / 10 || 0;
        }

        const result = coord.toFixed(6);
        console.log('Y좌표 변환 결과:', result);
        return result;
      },
    },
    {
      name: 'GPS방위각',
      length: 3,
      format: (value) => `${parseInt(value, 10) || 0}°`,
    },
    {
      name: '가속도ΔVx',
      length: 6,
      format: (value) => {
        // 데이터 로깅
        console.log('가속도ΔVx 원본:', value);

        // 가속도 변환
        let accel = parseFloat(value) / 10 || 0;

        // 비정상적인 값 보정 (예: -000.3 -> -0.3)
        if (value.startsWith('-')) {
          // 음수 처리
          const numPart = value.substring(1);
          accel = -parseFloat(numPart) / 10 || 0;
        } else if (Math.abs(accel) > 50) {
          // 비정상적으로 큰 값 보정
          accel = parseFloat(value.substring(0, 2)) / 10 || 0;
        }

        const result = `${accel.toFixed(1)} m/s²`;
        console.log('가속도ΔVx 변환 결과:', result);
        return result;
      },
    },
    {
      name: '가속도ΔVy',
      length: 6,
      format: (value) => {
        // 데이터 로깅
        console.log('가속도ΔVy 원본:', value);

        // 가속도 변환
        let accel = parseFloat(value) / 10 || 0;

        // 비정상적인 값 보정 (예: -000.2 -> -0.2)
        if (value.startsWith('-')) {
          // 음수 처리
          const numPart = value.substring(1);
          accel = -parseFloat(numPart) / 10 || 0;
        } else if (Math.abs(accel) > 50) {
          // 비정상적으로 큰 값 보정
          accel = parseFloat(value.substring(0, 2)) / 10 || 0;
        }

        const result = `${accel.toFixed(1)} m/s²`;
        console.log('가속도ΔVy 변환 결과:', result);
        return result;
      },
    },
    {
      name: '기기및통신상태코드',
      length: 2,
    },
  ];

  // 차량 기본 정보 레코드 길이
  const vehicleInfoLength = vehicleInfoFields.reduce(
    (sum, field) => sum + field.length,
    0,
  );

  // 운행 기록 데이터 레코드 길이
  const driveRecordLength = driveRecordFields.reduce(
    (sum, field) => sum + field.length,
    0,
  );

  // TanStack Table 설정
  const columnHelper = createColumnHelper<DriveRecord>();

  const columns = [
    columnHelper.accessor('id', {
      header: '번호',
      cell: (info) => info.getValue(),
    }),
    // 일일주행거리와 누적주행거리 컬럼 추가
    columnHelper.accessor('일일주행거리', {
      header: '일일주행거리',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('누적주행거리', {
      header: '누적주행거리',
      cell: (info) => info.getValue() || '-',
    }),
    // 기존 필드들 추가
    ...driveRecordFields.map((field) =>
      columnHelper.accessor(field.name as keyof DriveRecord, {
        header: field.name,
        cell: (info) => info.getValue(),
      }),
    ),
  ];

  const table = useReactTable({
    data: driveRecords,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setVehicleInfo(null);
      setDriveRecords([]);
      setError(null);
      setProgress(0);
    }
  };

  const readFileAsync = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target && e.target.result) {
          // ArrayBuffer로 읽은 경우
          if (e.target.result instanceof ArrayBuffer) {
            try {
              // EUC-KR 디코딩 시도
              const decoder = new TextDecoder('EUC-KR');
              const text = decoder.decode(e.target.result);
              resolve(text);
            } catch (error) {
              console.error('EUC-KR 디코딩 실패, UTF-8로 시도:', error);
              // 실패 시 UTF-8로 폴백
              const decoder = new TextDecoder('UTF-8');
              const text = decoder.decode(e.target.result);
              resolve(text);
            }
          }
          // 문자열로 읽은 경우 (폴백)
          else if (typeof e.target.result === 'string') {
            resolve(e.target.result);
          } else {
            reject(new Error('지원되지 않는 파일 형식입니다.'));
          }
        } else {
          reject(new Error('파일을 읽을 수 없습니다.'));
        }
      };

      reader.onerror = (e) => {
        console.error('파일 읽기 오류:', e);
        reject(new Error('파일 읽기 중 오류가 발생했습니다.'));
      };

      // 바이너리로 파일 읽기
      reader.readAsArrayBuffer(file);
    });
  };

  // 고정 위치 기반 파싱 함수 수정
  const parseFixedPositionData = (
    data: string,
  ): { vehicleInfo: VehicleInfo; remainingData: string } => {
    console.log('원본 데이터 처음 100자:', data.substring(0, 100));

    let pos = 0;
    const info: Partial<VehicleInfo> = {};

    // 각 필드를 순차적으로 파싱
    for (const field of vehicleInfoFields) {
      const value = data.substring(pos, pos + field.length);
      pos += field.length;

      console.log(`필드 ${field.name} 파싱:`, value);

      info[field.name as keyof VehicleInfo] = field.format
        ? field.format(value)
        : value;
    }

    // 남은 데이터 반환 (일일주행거리와 누적주행거리를 포함)
    const remainingData = data.substring(pos);
    console.log(
      '차량 정보 이후 데이터 시작 부분:',
      remainingData.substring(0, 50),
    );

    return { vehicleInfo: info as VehicleInfo, remainingData };
  };

  // 운행 기록 데이터 파싱 함수 수정
  const parseDriveRecord = (
    data: string,
    id: number,
    isFirstRecord: boolean = false,
  ): DriveRecord => {
    let pos = 0;
    const record: Partial<DriveRecord> = { id };

    // 첫 번째 레코드인 경우 일일주행거리와 누적주행거리 파싱
    if (isFirstRecord) {
      // 일일주행거리 파싱
      const dailyDistance = data.substring(pos, pos + 4);
      pos += 4;
      record.일일주행거리 = `${parseInt(dailyDistance, 10) || 0} km`;

      // 누적주행거리 파싱
      const totalDistance = data.substring(pos, pos + 7);
      pos += 7;
      record.누적주행거리 = `${parseInt(totalDistance, 10) || 0} km`;
    }

    // 나머지 필드 파싱
    driveRecordFields.forEach((field) => {
      const value = data.substring(pos, pos + field.length);
      pos += field.length;

      // 필드 값 직접 설정 (format 함수 적용)
      (record as any)[field.name] = field.format ? field.format(value) : value;
    });

    return record as DriveRecord;
  };

  const parseFile = useCallback(async () => {
    if (!file) return;

    setIsLoading(true);
    setProgress(0);
    setError(null);

    try {
      console.log('파일 파싱 시작:', file.name, file.size, file.type);

      // 파일 타입 확인
      if (!file.name.endsWith('.txt') && file.type !== 'text/plain') {
        console.warn('텍스트 파일이 아닐 수 있습니다:', file.type);
      }

      const text = await readFileAsync(file);
      console.log('파일 읽기 성공, 길이:', text.length);

      if (!text || text.trim() === '') {
        throw new Error('파일이 비어 있습니다.');
      }

      // 파일 내용 샘플 출력
      console.log('파일 내용 샘플 (처음 100자):', text.substring(0, 100));
      console.log(
        '파일 내용 샘플 (마지막 100자):',
        text.substring(text.length - 100),
      );

      // 줄바꿈으로 데이터 분리
      const content = text.replace(/\r\n/g, '\n').trim();
      console.log('파일 내용 처음 부분:', content.substring(0, 200));

      // 고정 위치 기반 파싱 사용
      const { vehicleInfo: parsedVehicleInfo, remainingData } =
        parseFixedPositionData(content);
      setVehicleInfo(parsedVehicleInfo);
      console.log('차량 기본 정보 파싱 완료:', parsedVehicleInfo);

      // 운행 기록 데이터 파싱
      const records: DriveRecord[] = [];
      let position = 0;
      let recordCount = 0;

      // 첫 번째 레코드에서 일일주행거리와 누적주행거리 파싱
      const dailyDistanceLength = 4;
      const totalDistanceLength = 7;
      const firstRecordOffset = dailyDistanceLength + totalDistanceLength;

      if (remainingData.length >= firstRecordOffset) {
        const dailyDistance = remainingData.substring(0, dailyDistanceLength);
        const totalDistance = remainingData.substring(
          dailyDistanceLength,
          firstRecordOffset,
        );

        console.log(
          '일일주행거리:',
          dailyDistance,
          '누적주행거리:',
          totalDistance,
        );

        // 첫 번째 레코드 이후의 데이터
        const recordsData = remainingData.substring(firstRecordOffset);

        console.log(
          '첫 번째 레코드 데이터 샘플:',
          recordsData.substring(0, 60),
        );
        console.log('전체 레코드 데이터 길이:', recordsData.length);
        console.log(
          '예상 레코드 개수:',
          Math.floor(recordsData.length / driveRecordLength),
        );
        console.log('각 레코드 길이:', driveRecordLength);

        // 각 레코드 파싱
        while (position + driveRecordLength <= recordsData.length) {
          const recordData = recordsData.substring(
            position,
            position + driveRecordLength,
          );

          if (recordData.length === driveRecordLength) {
            try {
              recordCount++;
              const isFirstRecord = recordCount === 1;

              // 레코드 데이터 로깅 (처음 5개만)
              if (recordCount <= 5) {
                console.log(`레코드 #${recordCount} 원본 데이터:`, recordData);
                console.log(
                  `레코드 길이:`,
                  recordData.length,
                  `예상 길이:`,
                  driveRecordLength,
                );

                // 각 필드별 데이터 로깅
                let fieldPos = 0;
                driveRecordFields.forEach((field) => {
                  const fieldValue = recordData.substring(
                    fieldPos,
                    fieldPos + field.length,
                  );
                  console.log(`필드 ${field.name}:`, fieldValue);
                  fieldPos += field.length;
                });
              }

              // 첫 번째 레코드인 경우 일일주행거리와 누적주행거리 추가
              const record = parseDriveRecord(
                recordData,
                recordCount,
                isFirstRecord,
              );

              // 첫 번째 레코드에만 일일주행거리와 누적주행거리 추가
              if (isFirstRecord) {
                record.일일주행거리 = `${parseInt(dailyDistance, 10) || 0} km`;
                record.누적주행거리 = `${parseInt(totalDistance, 10) || 0} km`;
              }

              // 콘솔에 로그된 값을 직접 사용하여 레코드 데이터 설정
              if (recordCount <= 5) {
                let fieldPos = 0;
                driveRecordFields.forEach((field) => {
                  const fieldValue = recordData.substring(
                    fieldPos,
                    fieldPos + field.length,
                  );
                  // 콘솔에 로그된 원본 값을 사용하여 레코드 값 설정
                  const formattedValue = field.format
                    ? field.format(fieldValue)
                    : fieldValue;
                  (record as any)[field.name] = formattedValue;
                  fieldPos += field.length;
                });
                console.log(`레코드 #${recordCount} 파싱 결과:`, record);
              }

              records.push(record);
            } catch (err) {
              console.error(`레코드 파싱 오류 (위치 ${position}):`, err);
            }
          }

          position += driveRecordLength;

          // 진행 상황 업데이트
          const progressPercent = Math.min(
            100,
            Math.round((position / recordsData.length) * 100),
          );
          setProgress(progressPercent);

          // UI 업데이트를 위한 지연
          if (recordCount % 100 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }
      }

      console.log(`총 ${records.length}개 레코드 파싱 완료`);
      setDriveRecords(records);

      if (records.length === 0) {
        setError('파싱된 운행 기록이 없습니다. 파일 형식을 확인해주세요.');
      }
    } catch (error) {
      console.error('파일 파싱 오류:', error);
      setError(
        error instanceof Error
          ? error.message
          : '파일 파싱 중 오류가 발생했습니다.',
      );
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  }, [file, driveRecordLength]);

  useEffect(() => {
    if (file) {
      const parseTimeout = setTimeout(() => {
        parseFile();
      }, 100);

      return () => clearTimeout(parseTimeout);
    }
  }, [file, parseFile]);

  return (
    <div className='app-container'>
      <h1 className='app-title'>운행기록</h1>

      <div className='file-upload-section'>
        <label className='file-label'>메모장 파일 업로드:</label>
        <input
          type='file'
          accept='.txt'
          onChange={handleFileChange}
          className='file-input'
        />
      </div>

      {isLoading && (
        <div className='loading-section'>
          <div className='loading-indicator'>
            <LoaderCircle className='spin' size={20} />
            <span className='loading-text'>파일 파싱 중... {progress}%</span>
          </div>
          <div className='progress-bar-container'>
            <div
              className='progress-bar'
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {error && (
        <div className='error-message'>
          <p>오류: {error}</p>
        </div>
      )}

      {vehicleInfo && (
        <div className='data-section'>
          <h2 className='section-title'>차량 기본 정보</h2>
          <div className='vehicle-info'>
            <table className='info-table'>
              <tbody>
                {Object.entries(vehicleInfo).map(([key, value]) => (
                  <tr key={key}>
                    <th>{key}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {driveRecords.length > 0 && (
        <div className='data-section'>
          <h2 className='section-title'>운행 기록 데이터</h2>
          <div className='records-info'>
            <p>
              <strong>총 레코드 수:</strong> {driveRecords.length}
            </p>
          </div>

          <div className='table-container'>
            <table className='data-table'>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className='table-header-cell'>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={row.index % 2 === 0 ? 'table-row-even' : ''}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className='table-cell'>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='pagination'>
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className='pagination-button'
            >
              {'<<'}
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className='pagination-button'
            >
              {'<'}
            </button>
            <span className='pagination-info'>
              페이지{' '}
              <strong>
                {table.getState().pagination.pageIndex + 1} /{' '}
                {table.getPageCount()}
              </strong>
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className='pagination-button'
            >
              {'>'}
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className='pagination-button'
            >
              {'>>'}
            </button>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className='pagination-select'
            >
              {[10, 20, 30, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}개 보기
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
