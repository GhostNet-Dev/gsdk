import QRCode from 'qrcode';
import { BrowserQRCodeReader, BrowserQRCodeSvgWriter } from '@zxing/browser';

export class QRCodeManager {
  private codeReader: BrowserQRCodeReader;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;

  constructor() {
    this.codeReader = new BrowserQRCodeReader();
  }

  /**
   * QR 코드를 Canvas에 생성
   * @param text - QR 코드에 담을 텍스트
   * @param canvasId - QR 코드를 렌더링할 Canvas 요소의 ID
   */
  public async generateQRCode(text: string, canvasId: string): Promise<void> {
    try {
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      if (!canvas) throw new Error(`Canvas element with ID '${canvasId}' not found.`);
      
      await QRCode.toCanvas(canvas, text);
      console.log("QR 코드 생성 완료:", text);
    } catch (error) {
      console.error("QR 코드 생성 오류:", error);
    }
  }

  /**
   * QR 코드를 Data URL 형태로 변환하여 반환
   * @param text - QR 코드에 담을 텍스트
   * @returns QR 코드 이미지의 Data URL
   */
  public async generateQRCodeDataURL(text: string): Promise<string> {
    try {
      return await QRCode.toDataURL(text);
    } catch (error) {
      console.error("QR 코드 생성 오류:", error);
      return "";
    }
  }

  /**
   * QR 코드 이미지를 다운로드
   * @param text - QR 코드에 담을 텍스트
   * @param filename - 다운로드할 파일 이름
   */
  public async downloadQRCode(text: string, filename: string = "qrcode.png"): Promise<void> {
    try {
      const dataUrl = await this.generateQRCodeDataURL(text);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log("QR 코드 다운로드 완료:", filename);
    } catch (error) {
      console.error("QR 코드 다운로드 오류:", error);
    }
  }

  /**
   * 웹캠을 통해 QR 코드 스캔 시작
   * @param videoId - QR 코드를 스캔할 Video 요소의 ID
   * @returns QR 코드의 텍스트 데이터
   */
  public async scanQRCode(videoId: string): Promise<string> {
    try {
      this.videoElement = document.getElementById(videoId) as HTMLVideoElement;
      if (!this.videoElement) throw new Error(`Video element with ID '${videoId}' not found.`);

      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      this.videoElement.srcObject = this.stream;
      this.videoElement.play();

      const result = await this.codeReader.decodeOnceFromVideoElement(this.videoElement);
      console.log("QR 코드 스캔 성공:", result.getText());

      this.stopScanning();
      return result.getText();
    } catch (error) {
      console.error("QR 코드 스캔 오류:", error);
      return "";
    }
  }

  /**
   * QR 코드 스캔 종료
   */
  public stopScanning(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
    }
    console.log("QR 코드 스캔 종료");
  }

  /**
   * QR 코드 이미지 파일을 업로드하여 QR 코드 인식
   * @param fileInputId - 파일 입력 요소의 ID
   * @returns QR 코드의 텍스트 데이터
   */
  public async scanQRCodeFromImage(fileInputId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileInput = document.getElementById(fileInputId) as HTMLInputElement;
      if (!fileInput || !fileInput.files?.length) {
        reject("QR 코드 이미지 파일을 선택해주세요.");
        return;
      }

      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const img = new Image();
          img.src = reader.result as string;

          img.onload = async () => {
            try {
              const result = await this.codeReader.decodeFromImageElement(img);
              console.log("QR 코드 이미지 스캔 성공:", result.getText());
              resolve(result.getText());
            } catch (error) {
              console.error("QR 코드 이미지 스캔 오류:", error);
              reject(error);
            }
          };
        } catch (error) {
          console.error("파일 읽기 오류:", error);
          reject(error);
        }
      };

      reader.readAsDataURL(file);
    });
  }
}

