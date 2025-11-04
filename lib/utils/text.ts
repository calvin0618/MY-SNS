/**
 * 텍스트 유틸리티 함수
 */

/**
 * 텍스트가 지정된 줄 수를 초과하는지 확인
 * 근사치 계산 (대략적인 줄 수)
 * @param text 텍스트 내용
 * @param maxLines 최대 줄 수
 * @param charsPerLine 줄당 대략적인 문자 수 (기본값: 50)
 * @returns 초과 여부
 */
export function isTextOverflow(
  text: string,
  maxLines: number = 2,
  charsPerLine: number = 50
): boolean {
  if (!text) return false;
  const estimatedLines = Math.ceil(text.length / charsPerLine);
  return estimatedLines > maxLines;
}

/**
 * 텍스트를 지정된 줄 수로 제한하고 "... 더 보기" 추가
 * @param text 텍스트 내용
 * @param maxLines 최대 줄 수
 * @param charsPerLine 줄당 대략적인 문자 수
 * @returns 제한된 텍스트
 */
export function truncateText(
  text: string,
  maxLines: number = 2,
  charsPerLine: number = 50
): string {
  if (!text) return "";
  const maxLength = maxLines * charsPerLine;
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

