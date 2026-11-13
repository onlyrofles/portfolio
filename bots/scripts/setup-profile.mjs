// Sets the bot's public profile: name, description shown before /start, short description, command menu.
// Usage (PowerShell):  $env:BARBER_TOKEN="..."; node scripts/setup-profile.mjs

const token = process.env.BARBER_TOKEN;
if (!token) {
  console.error('Задайте переменную BARBER_TOKEN.');
  process.exit(1);
}

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  console.log(method.padEnd(24), json.ok ? 'OK' : `ошибка: ${json.description}`);
}

await call('setMyName', { name: 'Борода и ножницы' });

await call('setMyDescription', {
  description:
    '💈 Барбершоп «Борода и ножницы»\n\nЗапись на стрижку онлайн: выберите услугу, мастера и время за минуту. Напомню о визите за день.\n\nДемо-бот: цены и адрес вымышленные. Сделал ONLYROFLES.'
});

await call('setMyShortDescription', { short_description: '💈 Онлайн-запись в барбершоп. Демо-бот от ONLYROFLES' });

await call('setMyCommands', {
  commands: [
    { command: 'start', description: '💈 Главное меню' },
    { command: 'myid', description: '🆔 Узнать свой chat id' }
  ]
});
