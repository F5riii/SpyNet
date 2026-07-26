const devices = [
    {
        id: "srv-core-01",
        name: "Core Server 01",
        type: "Server",
        ip: "10.0.10.12",
        location: "Data Center A",
        status: "online",
        cpu: 42,
        uptime: "31 days"
    },
    {
        id: "sw-floor-02",
        name: "Floor Switch 02",
        type: "Switch",
        ip: "10.0.20.4",
        location: "Office Floor 2",
        status: "warning",
        cpu: 67,
        uptime: "88 days"
    },
    {
        id: "rtr-edge-01",
        name: "Edge Router 01",
        type: "Router",
        ip: "10.0.1.1",
        location: "WAN Edge",
        status: "online",
        cpu: 36,
        uptime: "124 days"
    },
    {
        id: "srv-backup-01",
        name: "Backup Server 01",
        type: "Server",
        ip: "10.0.10.30",
        location: "Data Center B",
        status: "offline",
        cpu: 0,
        uptime: "offline"
    }
];

const commands = {
    "health-check": (device) => `ping ${device.ip}
show system status
show interfaces brief
show logging last 20`,
    "backup-config": (device) => `connect ${device.ip}
enable
show running-config
copy running-config spynet-backups/${device.id}.cfg`,
    "reload-service": (device) => `connect ${device.ip}
check service network-agent
restart service network-agent
show service network-agent status`,
    "update-firmware": (device) => `connect ${device.ip}
verify firmware package latest
schedule firmware install tonight 02:00
write memory`
};

const state = {
    selectedDeviceId: devices[0].id,
    tasks: [],
    logs: []
};

const elements = {
    activityLog: document.querySelector("#activityLog"),
    actionSelect: document.querySelector("#actionSelect"),
    clearLogBtn: document.querySelector("#clearLogBtn"),
    commandBox: document.querySelector("#commandBox"),
    deviceGrid: document.querySelector("#deviceGrid"),
    deviceSelect: document.querySelector("#deviceSelect"),
    form: document.querySelector("#automationForm"),
    metrics: document.querySelector("#metrics"),
    refreshBtn: document.querySelector("#refreshBtn"),
    saveTemplateBtn: document.querySelector("#saveTemplateBtn"),
    taskList: document.querySelector("#taskList"),
    typeFilter: document.querySelector("#typeFilter")
};

function getSelectedDevice() {
    return devices.find((device) => device.id === state.selectedDeviceId) || devices[0];
}

function formatStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function renderMetrics() {
    const online = devices.filter((device) => device.status === "online").length;
    const warning = devices.filter((device) => device.status === "warning").length;
    const offline = devices.filter((device) => device.status === "offline").length;
    const avgCpu = Math.round(
        devices.reduce((sum, device) => sum + device.cpu, 0) / devices.length
    );

    const metrics = [
        ["Devices", devices.length],
        ["Online", online],
        ["Needs attention", warning + offline],
        ["Average CPU", `${avgCpu}%`]
    ];

    elements.metrics.innerHTML = metrics
        .map(([label, value]) => `
            <div class="metric">
                <span>${label}</span>
                <strong>${value}</strong>
            </div>
        `)
        .join("");
}

function renderDevices() {
    const type = elements.typeFilter.value;
    const visibleDevices = type === "all"
        ? devices
        : devices.filter((device) => device.type === type);

    elements.deviceGrid.innerHTML = visibleDevices
        .map((device) => `
            <article class="device-card ${device.status}" data-device-id="${device.id}">
                <header>
                    <h3>${device.name}</h3>
                    <span class="badge ${device.status}">${formatStatus(device.status)}</span>
                </header>
                <dl>
                    <dt>Type</dt>
                    <dd>${device.type}</dd>
                    <dt>IP</dt>
                    <dd>${device.ip}</dd>
                    <dt>Location</dt>
                    <dd>${device.location}</dd>
                    <dt>CPU</dt>
                    <dd>${device.cpu}%</dd>
                    <dt>Uptime</dt>
                    <dd>${device.uptime}</dd>
                </dl>
            </article>
        `)
        .join("");
}

function renderDeviceOptions() {
    elements.deviceSelect.innerHTML = devices
        .map((device) => `<option value="${device.id}">${device.name} (${device.ip})</option>`)
        .join("");
    elements.deviceSelect.value = state.selectedDeviceId;
}

function renderCommandPreview() {
    const device = getSelectedDevice();
    const action = elements.actionSelect.value;
    elements.commandBox.value = commands[action](device);
}

function renderTasks() {
    if (state.tasks.length === 0) {
        elements.taskList.innerHTML = "<li>No automation tasks have been run yet.</li>";
        return;
    }

    elements.taskList.innerHTML = state.tasks
        .map((task) => `
            <li>
                <span>${task.action} on ${task.deviceName}</span>
                <span class="badge ${task.status}">${formatStatus(task.status)}</span>
            </li>
        `)
        .join("");
}

function renderLogs() {
    if (state.logs.length === 0) {
        elements.activityLog.innerHTML = '<div class="log-line">Waiting for automation activity...</div>';
        return;
    }

    elements.activityLog.innerHTML = state.logs
        .map((log) => `<div class="log-line">[${log.time}] ${log.message}</div>`)
        .join("");
    elements.activityLog.scrollTop = elements.activityLog.scrollHeight;
}

function addLog(message) {
    state.logs.push({
        time: new Date().toLocaleTimeString(),
        message
    });
    renderLogs();
}

function runAutomation(event) {
    event.preventDefault();

    const device = getSelectedDevice();
    const actionText = elements.actionSelect.selectedOptions[0].textContent;
    const task = {
        action: actionText,
        deviceName: device.name,
        status: "warning"
    };

    state.tasks.unshift(task);
    renderTasks();
    addLog(`Queued "${actionText}" for ${device.name} at ${device.ip}.`);

    window.setTimeout(() => {
        task.status = device.status === "offline" ? "offline" : "online";
        renderTasks();

        if (task.status === "offline") {
            addLog(`Failed: ${device.name} is offline and cannot accept commands.`);
            return;
        }

        addLog(`Success: ${actionText} completed on ${device.name}.`);
    }, 900);
}

function refreshDevices() {
    devices.forEach((device) => {
        if (device.status !== "offline") {
            device.cpu = Math.max(8, Math.min(95, device.cpu + Math.floor(Math.random() * 15) - 7));
        }
    });

    renderMetrics();
    renderDevices();
    addLog("Refreshed device metrics.");
}

function saveTemplate() {
    const device = getSelectedDevice();
    const actionText = elements.actionSelect.selectedOptions[0].textContent;
    addLog(`Saved template "${actionText}" using ${device.type} command defaults.`);
}

function bindEvents() {
    elements.actionSelect.addEventListener("change", renderCommandPreview);
    elements.clearLogBtn.addEventListener("click", () => {
        state.logs = [];
        renderLogs();
    });
    elements.deviceSelect.addEventListener("change", (event) => {
        state.selectedDeviceId = event.target.value;
        renderCommandPreview();
    });
    elements.form.addEventListener("submit", runAutomation);
    elements.refreshBtn.addEventListener("click", refreshDevices);
    elements.saveTemplateBtn.addEventListener("click", saveTemplate);
    elements.typeFilter.addEventListener("change", renderDevices);
}

function init() {
    renderMetrics();
    renderDevices();
    renderDeviceOptions();
    renderCommandPreview();
    renderTasks();
    renderLogs();
    bindEvents();
    addLog("SpyNet web automation console started.");
}

init();
