// js/calendar.js

function isMobile() {
    return window.innerWidth <= 768;
}

document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');

    // Determina a visualização inicial com base no tamanho da tela
    var initialView = isMobile() ? 'timeGridDay' : 'timeGridWeek';

    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: initialView,
        locale: 'pt-br',
        timeZone: 'local',
        height: 'auto',
        allDaySlot: false,
        slotDuration: '00:30:00',
        slotLabelInterval: '01:00',
        slotMinTime: '08:00:00',
        slotMaxTime: '21:00:00',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: isMobile() ? 'timeGridDay,listWeek' : 'timeGridWeek,timeGridDay'
        },
        selectable: true,
        selectOverlap: false,
        eventOverlap: false,
        longPressDelay: 0, // Adicionado para permitir seleção imediata em dispositivos móveis
        select: function(info) {
            // Calcula a duração em horas
            var start = moment(info.start);
            var end = moment(info.end);
            var duration = moment.duration(end.diff(start));
            var hours = duration.asHours();

            // Calcula o total
            var total = hours * 50; // R$ 50,00 por hora

            // Formata as datas e horas para exibir no WhatsApp
            var startFormatted = start.format('DD/MM/YYYY HH:mm');
            var endFormatted = end.format('DD/MM/YYYY HH:mm');

            // Mensagem para o WhatsApp
            var whatsappMessage = encodeURIComponent(
                `Olá, gostaria de agendar uma aula.\n` +
                `Data e Hora: ${startFormatted} até ${endFormatted}\n` +
                `Total de horas: ${hours}\n` +
                `Valor total: R$ ${total.toFixed(2)}`
            );

            // URL do WhatsApp com o número da professora e a mensagem
            var whatsappNumber = '+5581999298108'; // Substitua pelo número da professora
            var whatsappURL = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

            // Exibe o popup com o total e o botão do WhatsApp
            showPopup(total.toFixed(2), whatsappURL);

            calendar.unselect();
        },
        events: []
    });

    calendar.render();

    // Carrega os eventos do Firebase e atualiza o calendário
    var eventsRef = firebase.database().ref('events');
    eventsRef.on('value', function(snapshot) {
        var events = [];

        snapshot.forEach(function(childSnapshot) {
            var event = childSnapshot.val();
            events.push({
                id: childSnapshot.key,
                title: event.title,
                start: event.start,
                end: event.end,
                allDay: event.allDay
            });
        });

        // Remove todos os eventos atuais
        calendar.removeAllEvents();

        // Adiciona os eventos carregados
        calendar.addEventSource(events);
    });
});

// Função para exibir o popup com o total e botão do WhatsApp
function showPopup(total, whatsappURL) {
    var popup = document.getElementById('popup');
    var popupTotal = document.getElementById('popup-total');
    var whatsappButton = document.getElementById('whatsapp-button');

    popupTotal.textContent = 'Total: R$ ' + total;
    whatsappButton.href = whatsappURL;

    popup.classList.add('show');
}

// Função para fechar o popup
function closePopup() {
    var popup = document.getElementById('popup');
    popup.classList.remove('show');
}
