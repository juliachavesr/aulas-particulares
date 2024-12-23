document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');
    var requestButton = document.getElementById('request-appointment-button');
    var appointmentPopup = document.getElementById('appointment-popup');
    var appointmentSummary = document.getElementById('appointment-summary');
    var totalValue = document.getElementById('total-value');
    var contactButton = document.getElementById('contact-button');
    var copyPixButton = document.getElementById('copy-pix-button'); // Botão Pix dentro do popup

    // Array para armazenar as seleções
    var selectedSlots = [];

    // Função para verificar se o dispositivo é móvel
    function isMobile() {
        return window.innerWidth <= 768; // Ajuste conforme necessário
    }

    // Código Pix a ser copiado
    const PIX_CODE = '00020126330014br.gov.bcb.pix0111709076114275204000053039865802BR5925MARIA JULIA CHAVES RODRIG6009Sao Paulo62070503***6304F154';
    // Inicializa o calendário
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: isMobile() ? 'timeGridDay' : 'timeGridWeek',
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
            right: 'timeGridDay,listWeek,timeGridWeek'
        },
        selectable: !isMobile(), // Desabilita seleção em dispositivos móveis
        selectOverlap: false,
        nowIndicator: true,
        eventOverlap: false,
        select: function(info) {
            // Handler para seleção em desktops
            handleSelection(info.start, info.end);
            calendar.unselect();
        },
        dateClick: function(info) {
            if (isMobile()) {
                // Handler para seleção em dispositivos móveis
                var start = info.date;
                var end = new Date(start.getTime() + 30 * 60 * 1000); // Adiciona 30 minutos
                handleSelection(start, end);
            }
        },
        eventClick: function(info) {
            if (info.event.title === 'Selecionado') {
                // Remove da lista de seleções
                selectedSlots = selectedSlots.filter(function(slot) {
                    return !(slot.start.getTime() === info.event.start.getTime() && slot.end.getTime() === info.event.end.getTime());
                });

                // Remove o evento do calendário
                info.event.remove();

                // Oculta o botão se não houver mais seleções
                if (selectedSlots.length === 0) {
                    requestButton.classList.add('hidden');
                }
            }
        },
        events: []
    });

    // Adiciona classe ao calendário em dispositivos móveis
    if (isMobile()) {
        calendarEl.classList.add('mobile-calendar');
    }

    // Renderiza o calendário
    calendar.render();

    // Carrega os eventos do Firebase e atualiza o calendário
    var eventsRef = firebase.database().ref('events');
    eventsRef.on('value', function(snapshot) {
        var events = [];

        snapshot.forEach(function(childSnapshot) {
            var event = childSnapshot.val();
            events.push({
                id: childSnapshot.key,
                title: "Horário Ocupado",
                start: event.start,
                end: event.end,
                allDay: event.allDay
            });
        });

        // Remove todos os eventos atuais, exceto os "Selecionado"
        calendar.getEvents().forEach(function(event) {
            if (event.title !== 'Selecionado') {
                event.remove();
            }
        });

        // Adiciona os eventos carregados
        calendar.addEventSource(events);
    });

    // Função para lidar com a seleção de horários
    function handleSelection(start, end) {
        // Verifica se já há um slot selecionado na faixa
        var overlap = selectedSlots.some(function(slot) {
            return (start < slot.end && end > slot.start);
        });

        if (overlap) {
            alert('Esse horário já está selecionado.');
            return;
        }

        // Adiciona o slot à lista de seleções
        selectedSlots.push({ start: start, end: end });

        // Adiciona um evento para destacar a seleção
        calendar.addEvent({
            title: 'Selecionado',
            start: start,
            end: end,
            color: '#d81b60',
            classNames: ['selected-slot']
        });

        // Mostra o botão de solicitar agendamento
        requestButton.classList.remove('hidden');

        // Mantém o botão sempre visível em dispositivos móveis
        if (isMobile()) {
            requestButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Função para abrir o popup de agendamento
    window.openAppointmentPopup = function() {
        if (selectedSlots.length === 0) {
            alert('Por favor, selecione pelo menos um horário.');
            return;
        }

        var summaryText = '';
        var total = 0;

        // Ordena os slots selecionados
        selectedSlots.sort(function(a, b) {
            return a.start - b.start;
        });

        // Agrupa slots consecutivos
        var groupedSlots = [];
        var groupStart = selectedSlots[0].start;
        var groupEnd = selectedSlots[0].end;

        for (var i = 1; i < selectedSlots.length; i++) {
            var currentSlot = selectedSlots[i];
            var previousSlot = selectedSlots[i - 1];

            // Verifica se o slot atual é consecutivo ao anterior
            if (currentSlot.start.getTime() === previousSlot.end.getTime()) {
                groupEnd = currentSlot.end;
            } else {
                // Adiciona o grupo anterior à lista
                groupedSlots.push({ start: groupStart, end: groupEnd });
                // Inicia um novo grupo
                groupStart = currentSlot.start;
                groupEnd = currentSlot.end;
            }
        }
        // Adiciona o último grupo à lista
        groupedSlots.push({ start: groupStart, end: groupEnd });

        // Gera o resumo dos horários agrupados
        groupedSlots.forEach(function(slot) {
            var start = moment(slot.start).format('DD/MM/YYYY HH:mm');
            var end = moment(slot.end).format('DD/MM/YYYY HH:mm');
            summaryText += `Data e Hora: ${start} até ${end}\n`;
            var duration = moment.duration(slot.end - slot.start);
            var hours = duration.asHours();
            total += hours * 50; // R$ 50,00 por hora
        });

        appointmentSummary.textContent = summaryText;
        totalValue.textContent = `Valor Total: R$ ${total.toFixed(2)}`;

        // Gera a mensagem para o botão de contato
        var whatsappMessage = encodeURIComponent(
            `Olá, gostaria de agendar uma aula.\n\n` +
            `${summaryText}\n` +
            `Valor total: R$ ${total.toFixed(2)}`
        );

        var whatsappNumber = '5581999298108'; // Substitua pelo número da professora
        var whatsappURL = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
        contactButton.href = whatsappURL;

        // Exibe o popup
        appointmentPopup.classList.add('show');
    };

    // Função para fechar o popup de agendamento
    window.closeAppointmentPopup = function() {
        appointmentPopup.classList.remove('show');
    };

    // Função para modificar a seleção (fechar o popup)
    window.modifySelection = function() {
        closeAppointmentPopup();
    };

    // Ajusta a visualização e configurações ao redimensionar a janela
    window.addEventListener('resize', function() {
        var wasMobile = calendarEl.classList.contains('mobile-calendar');
        var nowMobile = isMobile();

        if (wasMobile && !nowMobile) {
            calendarEl.classList.remove('mobile-calendar');
            calendar.changeView('timeGridWeek');
            calendar.setOption('selectable', true);
        } else if (!wasMobile && nowMobile) {
            calendarEl.classList.add('mobile-calendar');
            calendar.changeView('timeGridDay');
            calendar.setOption('selectable', false);
        }
    });

    // Função para copiar o código Pix para a área de transferência
    copyPixButton.addEventListener('click', function() {
        // Cria um elemento temporário para copiar o texto
        var tempInput = document.createElement('input');
        tempInput.value = PIX_CODE;
        document.body.appendChild(tempInput);
        tempInput.select();
        tempInput.setSelectionRange(0, 99999); // Para dispositivos móveis

        try {
            var successful = document.execCommand('copy');
            if (successful) {
                // Feedback visual ao usuário (mantém o estilo dos botões existentes)
                copyPixButton.classList.add('copied');
                copyPixButton.querySelector('span').textContent = 'Copiado!';
                setTimeout(function() {
                    copyPixButton.classList.remove('copied');
                    copyPixButton.querySelector('span').textContent = 'Copiar Pix';
                }, 2000);
            } else {
                console.error('Falha ao copiar o código Pix.');
            }
        } catch (err) {
            console.error('Erro ao copiar o código Pix:', err);
        }

        // Remove o elemento temporário
        document.body.removeChild(tempInput);
    });
});
