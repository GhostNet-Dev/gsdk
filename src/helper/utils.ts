
const formatTimeDifference = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    // 밀리초 기준
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
        return "now"; // 1분 미만
    } else if (minutes < 60) {
        return `${minutes} minutes ago`; // 1시간 미만
    } else if (hours < 24) {
        return `${hours} hours ago`; // 24시간 미만
    } else {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");

        return `${year}-${month}-${day}`; // 날짜 형식 (YYYY-MM-DD)
    }
}


export { formatTimeDifference }