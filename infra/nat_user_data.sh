#!/bin/bash
# Turns an Amazon Linux 2023 instance into a NAT for the private app subnets.
set -euxo pipefail

dnf install -y iptables-services
echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/90-nat.conf
sysctl -p /etc/sysctl.d/90-nat.conf

systemctl enable --now iptables
IFACE=$(ip route show default | awk '{print $5; exit}')
iptables -F FORWARD
iptables -t nat -A POSTROUTING -o "$IFACE" -s 10.0.0.0/16 -j MASQUERADE
service iptables save
