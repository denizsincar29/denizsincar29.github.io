document.addEventListener('DOMContentLoaded', function() {
    const countdownElement = document.getElementById('countdown');
    const timerMessageElement = document.getElementById('timer-message');
    const joinButtonElement = document.getElementById('join-button');
    
    let timeLeft = 30; // Время в секундах

    // Обновляем текст таймера при загрузке
    if (countdownElement) {
        countdownElement.textContent = timeLeft;
    }

    const timerInterval = setInterval(() => {
        timeLeft--;
        if (countdownElement) {
            countdownElement.textContent = timeLeft;
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (timerMessageElement) {
                timerMessageElement.style.display = 'none';
            }
            if (joinButtonElement) {
                joinButtonElement.style.display = 'inline-block';
            }
        }
    }, 1000); // Обновляем каждую секунду (1000 миллисекунд)
});