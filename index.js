require("dotenv").config();
const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers // 🔹 necesario para leer roles en Railway
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();

// ===================== AUTOTHREADS STORAGE =====================
let autoThreadsChannels = [];
const autoThreadsFile = "autothreads.json";

if (fs.existsSync(autoThreadsFile)) {
  autoThreadsChannels = JSON.parse(fs.readFileSync(autoThreadsFile, "utf8"));
}

function saveAutoThreads() {
  fs.writeFileSync(autoThreadsFile, JSON.stringify(autoThreadsChannels, null, 2));
}

// ===================== READY =====================
client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

// ===================== INTERACTION =====================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "embed") {
    const titulo = interaction.options.getString("titulo");
    const descripcion = interaction.options.getString("descripcion");

    await interaction.reply({
      embeds: [
        {
          color: 0x5865f2,
          title: titulo,
          description: descripcion
        }
      ]
    });
  }

  // ===================== AUTOTHREAD =====================
  if (interaction.commandName === "autothread") {
    const requiredRoleId = process.env.AUTOTHREAD_ROLE;

    let member;
    try {
      member = await interaction.guild.members.fetch(interaction.user.id); // 🔹 fetch para leer roles
    } catch (err) {
      console.error("❌ Error al obtener miembro:", err);
      return interaction.reply({
        content: "⚠️ No pude verificar tus roles, intenta de nuevo.",
        ephemeral: true
      });
    }

    if (!member.roles.cache.has(requiredRoleId)) {
      return interaction.reply({
        content: "⛔ No tienes permisos para usar este comando.",
        ephemeral: true
      });
    }

    const canal = interaction.options.getChannel("canal");

    if (!canal.isTextBased()) {
      return interaction.reply({
        content: "⚠️ Ese canal no es de texto válido.",
        ephemeral: true
      });
    }

    if (autoThreadsChannels.includes(canal.id)) {
      autoThreadsChannels = autoThreadsChannels.filter((id) => id !== canal.id);
      saveAutoThreads();
      return interaction.reply(`❌ El canal <#${canal.id}> ya no tendrá auto-hilos.`);
    } else {
      autoThreadsChannels.push(canal.id);
      saveAutoThreads();
      return interaction.reply(`✅ El canal <#${canal.id}> ahora tendrá auto-hilos para imágenes/videos.`);
    }
  }
});

// ===================== MESSAGE CREATE =====================
client.on("messageCreate", async (message) => {
  if (
    message.author.bot ||
    !autoThreadsChannels.includes(message.channel.id) ||
    (!message.attachments.size && !message.content.match(/\.(jpg|jpeg|png|gif|mp4|mov|webm)$/i))
  )
    return;

  try {
    await message.startThread({
      name: `Hilo de ${message.author.username}`,
      autoArchiveDuration: 60
    });
  } catch (err) {
    console.error("❌ Error creando hilo:", err);
  }
});

client.login(process.env.TOKEN);
