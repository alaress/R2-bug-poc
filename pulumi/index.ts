import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as std from "@pulumi/std"
import * as vpcmod from "@pulumi/vpcmod";

const azs = aws.getAvailabilityZonesOutput({}).names.apply(names => names.slice(0,1));

const cidr = "10.0.0.0/16"

const vpc = new vpcmod.Module("vpc", {
    azs: azs,
    name: "cf-poc",
    cidr,
    public_subnets: azs.apply(azs => azs.map((_,i) => {
        return getCidrSubnet(cidr, i+1)
    }))
})

function getCidrSubnet(cidr: string, netnum: number): pulumi.Output<string> {
    return std.cidrsubnetOutput({
        input: cidr,
        newbits: 8,
        netnum: netnum,
    }).result;
}

const sg = new aws.ec2.SecurityGroup("sg", {
    name: "cf-poc-sg",
    vpcId: vpc.vpc_id.apply(vpcId => vpcId!),
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }]
});

const ami = pulumi.output(aws.ec2.getAmi({
    mostRecent: true,
    owners: ["099720109477"],
    filters: [{
        name: "name",
        values: ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"],
    }],
}));

const subnetId = vpc.public_subnets.apply(subnets => subnets![0]);

const instance = new aws.ec2.Instance("instance", {
    ami: ami.id,
    instanceType: "t3.micro",
    vpcSecurityGroupIds: [sg.id],
    subnetId: subnetId,
    associatePublicIpAddress: true,
    userData: `#!/bin/bash
    apt-get update
    apt-get install -y git
    add-apt-repository ppa:ondrej/php
    apt-get update
    apt-get install -y php8.2-cli composer
    `,
    userDataReplaceOnChange: true,
    tags: {
        Name: "cf-poc-instance",
    },
});

export const instanceID = instance.id;
