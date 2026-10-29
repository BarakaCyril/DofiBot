// /clear [amount]: deletes recent messages in the channel it's used in.
// Only people with the "Manage Messages" permission can see or use it.
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete recent messages in this channel')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('How many recent messages to delete (1–100, default 100)')
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount') || 100;
    const channel = interaction.channel;

    // Dofibot needs the same permission to delete other people's messages.
    const botPermissions = channel.permissionsFor(interaction.guild.members.me);
    if (!botPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({
        content:
          'I need the **Manage Messages** permission in this channel to delete messages. ' +
          'Ask a server admin to give it to my role (Server Settings → Roles).',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Discord only lets bots bulk-delete messages from the last 14 days;
    // "true" skips older ones instead of failing.
    const deleted = await channel.bulkDelete(amount, true);
    const skipped = deleted.size < amount
      ? ' Messages older than 14 days have to be deleted by hand (or clone and delete the channel).'
      : '';
    await interaction.editReply(`🧹 Deleted ${deleted.size} message${deleted.size === 1 ? '' : 's'}.${skipped}`);
  },
};
